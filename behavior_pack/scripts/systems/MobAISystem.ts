// MobAISystem.ts
// ─────────────────────────────────────────────────────────────────────────────
// Script-side AI — handles only what the Behavior Pack can't:
//   phase transitions, attack dispatch, special effects.
//
// Locomotion (pathfinding, targeting, melee) is handled by the Behavior Pack.
// Script never moves mobs directly.
//
// DYNAMIC PROPERTIES (stored on entity):
//   "ai:phase"       → 1 | 2 | 3           (health threshold bands)
//   "ai:attack_cd"   → number (tick)        (next attack allowed at this tick)
//   "ai:last_attack" → string               (name of last executed attack)
// ─────────────────────────────────────────────────────────────────────────────

import {
  world,
  system,
  Entity,
  Player,
  Dimension,
  EntityHealthComponent,
  EntityDamageCause,
  GameMode,
  MolangVariableMap,
} from "@minecraft/server";

const AI_TICK_INTERVAL = 10; // run every 10 ticks (2x per second)

// ── Per-tick context ──────────────────────────────────────────────────────────

interface AIContext {
  phase: number;
  healthPct: number;
  dimension: Dimension;
  attackCd: number;   // tick at which the next attack is allowed
  lastAttack: string;   // name of the last executed attack (for rotation)
}

type BrainFn = (mob: Entity, ctx: AIContext) => void;
type AttackFn = (mob: Entity, ctx: AIContext) => void;

// ── AI Registry ───────────────────────────────────────────────────────────────

const AI_REGISTRY: Record<string, BrainFn> = {
  "ai:rune_guardian": RuneGuardianBrain,
};

// ─────────────────────────────────────────────────────────────────────────────

export class MobAISystem {
  static init(): void {
    system.runInterval(() => {
      MobAISystem.#tick();
    }, AI_TICK_INTERVAL);

    world.afterEvents.entityHurt.subscribe((ev) => {
      if (ev.damageSource.damagingEntity?.typeId !== "rune:voidslice") return;
      if (!(ev.hurtEntity instanceof Player)) return;
      ev.hurtEntity.addEffect("darkness", 60, { amplifier: 0 });
    });

    console.log("[MobAISystem] Initialized. AI types:", Object.keys(AI_REGISTRY).join(", "));
  }

  static #tick(): void {
    for (const player of world.getAllPlayers()) {
      const dimension = player.dimension;
      for (const [tag, brain] of Object.entries(AI_REGISTRY)) {
        for (const mob of dimension.getEntities({
          tags: [tag],
          location: player.location,
          maxDistance: 128,
        })) {
          try {
            brain(mob, MobAISystem.#buildContext(mob, dimension));
          } catch (err) {
            console.warn(`[MobAISystem] Brain error [${tag}]: ${err}`);
          }
        }
      }
    }
  }

  static #buildContext(mob: Entity, dimension: Dimension): AIContext {
    const phase = (mob.getDynamicProperty("ai:phase") as number | undefined) ?? 1;
    const attackCd = (mob.getDynamicProperty("ai:attack_cd") as number | undefined) ?? 0;
    const lastAttack = (mob.getDynamicProperty("ai:last_attack") as string | undefined) ?? "";
    const health = mob.getComponent("minecraft:health") as EntityHealthComponent | undefined;
    const healthPct = health ? health.currentValue / health.effectiveMax : 1;

    return { phase, healthPct, dimension, attackCd, lastAttack };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function computePhase(healthPct: number): number {
  if (healthPct > 0.66) return 1;
  if (healthPct > 0.33) return 2;
  return 3;
}

function onPhaseEnter(mob: Entity, ctx: AIContext, newPhase: number): void {
  const nearby = getCombatPlayers(mob, ctx, 40);

  if (newPhase === 2) {
    mob.addEffect("strength", 1200, { amplifier: 1 });
    mob.addEffect("speed", 600, { amplifier: 1 });
    for (const p of nearby) {
      p.sendMessage("§6§l! The Rune Guardian stirs — its power grows !");
      p.applyDamage(6, { cause: EntityDamageCause.magic, damagingEntity: mob });
    }
  }

  if (newPhase === 3) {
    mob.addEffect("strength", 1200, { amplifier: 2 });
    mob.addEffect("speed", 600, { amplifier: 2 });
    mob.addEffect("resistance", 600, { amplifier: 1 });
    for (const p of nearby) {
      p.sendMessage("§4§l⚠ THE RUNE GUARDIAN UNLEASHES ITS TRUE POWER ⚠");
      p.applyDamage(10, { cause: EntityDamageCause.magic, damagingEntity: mob });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK TABLES
// ─────────────────────────────────────────────────────────────────────────────

// Which attacks are available per phase. Phase 1 = 1 attack unlocked, etc.
const ATTACK_POOL: Record<number, string[]> = {
  1: ["thunderslap"],
  2: ["thunderslap", "void_slices"],
  3: ["fire_breath", "thunderslap", "void_slices"],
};

// Ticks between attack uses (global cooldown applied after each attack)
const ATTACK_COOLDOWNS: Record<string, number> = {
  thunderslap: 100, // 5s
  void_slices: 140, // 7s
  fire_breath: 80, // 4s
};

// Stub executors — replace with real implementations later
const ATTACK_FNS: Record<string, AttackFn> = {
  thunderslap: executeThunderslap,
  void_slices: executeVoidSlices,
  fire_breath: executeFireBreath,
};

function getCombatPlayers(mob: Entity, ctx: AIContext, range: number): Player[] {
  return (ctx.dimension.getEntities({
    type: "minecraft:player",
    maxDistance: range,
    location: mob.location,
  }) as Player[]).filter(p => {
    const mode = p.getGameMode();
    return mode !== GameMode.creative && mode !== GameMode.spectator;
  });
}

function selectAttack(phase: number, lastAttack: string): string {
  const pool = ATTACK_POOL[phase] ?? ATTACK_POOL[1];
  const candidates = pool.length > 1
    ? pool.filter(a => a !== lastAttack)  // avoid immediate repeat when possible
    : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAIN: Rune Guardian (boss)
//
// BP handles: targeting, pathfinding, melee attacks, idle wander.
// Script handles: phase transitions, special attack dispatch.
// ─────────────────────────────────────────────────────────────────────────────

function RuneGuardianBrain(mob: Entity, ctx: AIContext): void {
  if (!mob.isValid) return;
  const { phase, healthPct, attackCd, lastAttack } = ctx;

  // ── Phase transition check ────────────────────────────────────────────────
  const newPhase = computePhase(healthPct);
  if (newPhase > phase) {
    mob.setDynamicProperty("ai:phase", newPhase);
    onPhaseEnter(mob, ctx, newPhase);
    return; // skip attack this tick — phase burst counts as the action
  }

  // ── Attack dispatch ───────────────────────────────────────────────────────
  if (system.currentTick < attackCd) return; // still on cooldown
  if (getCombatPlayers(mob, ctx, 24).length === 0) return; // no valid target

  const attack = selectAttack(phase, lastAttack);
  const fn = ATTACK_FNS[attack];
  if (!fn) return;

  fn(mob, ctx);
  mob.setDynamicProperty("ai:last_attack", attack);
  mob.setDynamicProperty("ai:attack_cd", system.currentTick + ATTACK_COOLDOWNS[attack]);
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK STUBS — fill in per attack
// ─────────────────────────────────────────────────────────────────────────────

function executeThunderslap(mob: Entity, ctx: AIContext): void {
  mob.setProperty("rune:is_thunderslap", true);

  // Hit frame: sonic_boom body peaks at 1.9167s ≈ 38 ticks
  system.runTimeout(() => {
    try {
      const loc = mob.location;

      const nearby = ctx.dimension.getEntities({
        type: "minecraft:player",
        maxDistance: 6,
        location: loc,
      }) as Player[];

      for (const p of nearby) {
        // Knockback direction: away from boss
        const dx = p.location.x - loc.x;
        const dz = p.location.z - loc.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        p.applyKnockback(dx / len, dz / len, 2.5, 0.5);
        p.applyDamage(12, { cause: EntityDamageCause.entityAttack, damagingEntity: mob });
      }

      // Lightning strikes scattered across the slam zone
      for (let i = 0; i < 3; i++) {
        ctx.dimension.spawnEntity("minecraft:lightning_bolt", {
          x: loc.x + (Math.random() - 0.5) * 8,
          y: loc.y,
          z: loc.z + (Math.random() - 0.5) * 8,
        });
      }
    } catch { /* mob despawned before hit frame */ }
  }, 38);

  // Reset property once animation ends (sonic_boom = 3s = 60 ticks)
  system.runTimeout(() => {
    try { mob.setProperty("rune:is_thunderslap", false); } catch { /* ok */ }
  }, 60);
}

function executeVoidSlices(mob: Entity, ctx: AIContext): void {
  mob.setProperty("rune:is_void_slices", true);

  const loc = mob.location;
  const spawned: Entity[] = [];

  // Scatter 3 slices at random angles, 4–7 blocks out
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 4 + Math.random() * 3;
    try {
      const slice = ctx.dimension.spawnEntity("rune:voidslice", {
        x: loc.x + Math.cos(angle) * dist,
        y: loc.y + 0.5, // hover slightly above ground
        z: loc.z + Math.sin(angle) * dist,
      });
      spawned.push(slice);
    } catch { /* ok */ }
  }

  // Reset animation property after attack anim ends (0.33s = 7 ticks)
  system.runTimeout(() => {
    try { mob.setProperty("rune:is_void_slices", false); } catch { /* ok */ }
  }, 7);

  // Slices linger for 5 seconds then despawn
  system.runTimeout(() => {
    for (const s of spawned) {
      try { s.remove(); } catch { /* already despawned */ }
    }
  }, 100);
}

function executeFireBreath(mob: Entity, ctx: AIContext): void {
  mob.setProperty("rune:is_fire_breath", true);

  // Spawn fire breath particle stream aligned to boss facing direction
  const forward = mob.getViewDirection();
  const fwdLen = Math.sqrt(forward.x * forward.x + forward.z * forward.z) || 1;
  const fx = forward.x / fwdLen;
  const fz = forward.z / fwdLen;

  const vars = new MolangVariableMap();
  vars.setFloat("variable.dir_x", fx);
  vars.setFloat("variable.dir_z", fz);
  vars.setFloat("variable.scale", 1.5); // boss is bigger
  ctx.dimension.spawnParticle("rune:fire_breath", mob.location, vars);

  // Roar animation: body fully leans forward at 1.6s = 32 ticks — that's the breath hit
  system.runTimeout(() => {
    try {
      const forward = mob.getViewDirection();
      const loc = mob.location;

      // Project forward onto XZ plane (ignore vertical aim — boss doesn't tilt to aim up/down)
      const fwdLen = Math.sqrt(forward.x * forward.x + forward.z * forward.z) || 1;
      const fx = forward.x / fwdLen;
      const fz = forward.z / fwdLen;

      const nearby = ctx.dimension.getEntities({
        type: "minecraft:player",
        maxDistance: 10,
        location: loc,
      }) as Player[];

      for (const p of nearby) {
        // XZ direction from boss to player
        const dx = p.location.x - loc.x;
        const dz = p.location.z - loc.z;
        const dlen = Math.sqrt(dx * dx + dz * dz) || 1;
        const dot = (dx / dlen) * fx + (dz / dlen) * fz;

        // dot > cos(50°) ≈ 0.64 → player is within the breath cone
        if (dot > 0.64) {
          p.applyDamage(8, { cause: EntityDamageCause.fire, damagingEntity: mob });
          p.setOnFire(3, true); // burn for 3 seconds
        }
      }
    } catch { /* ok */ }
  }, 32);

  // Reset property after roar animation ends (4.2s ≈ 84 ticks)
  system.runTimeout(() => {
    try { mob.setProperty("rune:is_fire_breath", false); } catch { /* ok */ }
  }, 84);
}

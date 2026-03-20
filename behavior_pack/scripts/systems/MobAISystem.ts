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
  globalCd: number;                  // tick at which any attack is next allowed
  attackCds: Record<string, number>; // per-attack: tick at which that attack is next allowed
  lastAttack: string;                // name of last executed attack (for rotation)
}

type BrainFn = (mob: Entity, ctx: AIContext) => void;
type AttackFn = (mob: Entity, ctx: AIContext, target: Entity) => void;

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

    // Voidslice hits players → apply darkness
    world.afterEvents.entityHurt.subscribe((ev) => {
      if (ev.damageSource.damagingEntity?.typeId !== "rune:voidslice") return;
      if (!(ev.hurtEntity instanceof Player)) return;
      ev.hurtEntity.addEffect("darkness", 60, { amplifier: 0 });
    });

    // Voidslices are fully immune to all damage — they are script-managed and only despawn via timeout.
    world.afterEvents.entityHurt.subscribe((ev) => {
      if (ev.hurtEntity.typeId !== "rune:voidslice") return;
      const health = ev.hurtEntity.getComponent("minecraft:health") as EntityHealthComponent | undefined;
      if (health) health.setCurrentValue(health.effectiveMax);
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
    const lastAttack = (mob.getDynamicProperty("ai:last_attack") as string | undefined) ?? "";
    const health = mob.getComponent("minecraft:health") as EntityHealthComponent | undefined;
    const healthPct = health ? health.currentValue / health.effectiveMax : 1;

    const globalCd = (mob.getDynamicProperty("ai:global_cd") as number | undefined) ?? 0;
    const attackCds: Record<string, number> = {};
    for (const name of Object.keys(ATTACK_COOLDOWNS)) {
      attackCds[name] = (mob.getDynamicProperty(`ai:${name}_cd`) as number | undefined) ?? 0;
    }

    return { phase, healthPct, dimension, globalCd, attackCds, lastAttack };
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
  const nearby = getCombatTargets(mob, ctx, 40).filter(e => e instanceof Player) as Player[];

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
  void_slices: 200, // 10s
  fire_breath: 280, // 14s
};

// [min, max] distance (blocks) at which each attack can trigger
const ATTACK_RANGES: Record<string, [number, number]> = {
  thunderslap: [0, 4],   // melee only
  void_slices: [0, 4],
  fire_breath: [0, 6],   // 1/3 of 24
};

// Ticks the guardian must wait after ANY attack before firing the next one.
// Prevents back-to-back chaining of different attacks.
const GLOBAL_ATTACK_CD = 40; // 2s

// Stub executors — replace with real implementations later
const ATTACK_FNS: Record<string, AttackFn> = {
  thunderslap: executeThunderslap,
  void_slices: executeVoidSlices,
  fire_breath: executeFireBreath,
};

// Returns all valid combat targets in range — players (non-creative/spectator) + other mobs.
// Excludes the guardian itself, its own voidslice projectiles, and non-damageable entities.
function getCombatTargets(mob: Entity, ctx: AIContext, range: number): Entity[] {
  const all = ctx.dimension.getEntities({ maxDistance: range, location: mob.location });
  return all.filter(e => {
    if (e === mob) return false;
    if (e.typeId === "rune:voidslice") return false;
    if (e instanceof Player) {
      const mode = e.getGameMode();
      return mode !== GameMode.creative && mode !== GameMode.spectator;
    }
    // Exclude non-damageable helper entities
    const health = e.getComponent("minecraft:health") as EntityHealthComponent | undefined;
    return health !== undefined;
  });
}

// Returns the nearest combat target the mob is roughly facing (within ~60°).
function getMainTarget(mob: Entity, ctx: AIContext, range: number): Entity | undefined {
  const targets = getCombatTargets(mob, ctx, range);
  if (targets.length === 0) return undefined;

  const view = mob.getViewDirection();
  const fwdLen = Math.sqrt(view.x * view.x + view.z * view.z) || 1;
  const fx = view.x / fwdLen;
  const fz = view.z / fwdLen;
  const loc = mob.location;

  let best: Entity | undefined;
  let bestDist = Infinity;

  for (const t of targets) {
    const dx = t.location.x - loc.x;
    const dz = t.location.z - loc.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const dot = (dx / dist) * fx + (dz / dist) * fz;
    if (dot > 0.5 && dist < bestDist) { // within ~60° arc
      best = t;
      bestDist = dist;
    }
  }

  return best;
}

function selectAttack(phase: number, lastAttack: string, targetDist: number, attackCds: Record<string, number>): string | undefined {
  const pool = (ATTACK_POOL[phase] ?? ATTACK_POOL[1])
    .filter(a => { const [min, max] = ATTACK_RANGES[a] ?? [0, Infinity]; return targetDist >= min && targetDist <= max; })
    .filter(a => system.currentTick >= (attackCds[a] ?? 0));
  if (pool.length === 0) return undefined;
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

function debugActionbar(mob: Entity, ctx: AIContext): void {
  const tick = system.currentTick;
  const health = mob.getComponent("minecraft:health") as EntityHealthComponent | undefined;
  const hp = health ? Math.ceil(health.currentValue) : "?";
  const maxHp = health ? health.effectiveMax : "?";

  const globalRemain = Math.max(0, ctx.globalCd - tick);

  const cdParts = Object.entries(ctx.attackCds).map(([name, cd]) => {
    const remain = Math.max(0, cd - tick);
    const label = name.replace("_", " ");
    return remain > 0 ? `§7${label}:§c${remain}t` : `§7${name.replace("_", " ")}:§aRDY`;
  });

  const bar = `§lRune Guardian§r §7[${hp}/${maxHp}]§r  GlobalCD:${globalRemain > 0 ? `§c${globalRemain}t` : "§aRDY"}  ${cdParts.join("  ")}`;

  for (const p of world.getAllPlayers()) {
    const dx = p.location.x - mob.location.x;
    const dz = p.location.z - mob.location.z;
    if (dx * dx + dz * dz <= 64 * 64) {
      p.onScreenDisplay.setActionBar(bar);
    }
  }
}

function RuneGuardianBrain(mob: Entity, ctx: AIContext): void {
  if (!mob.isValid) return;
  const { phase, healthPct, globalCd, attackCds, lastAttack } = ctx;

  debugActionbar(mob, ctx);

  // ── Phase transition check ────────────────────────────────────────────────
  const newPhase = computePhase(healthPct);
  if (newPhase > phase) {
    mob.setDynamicProperty("ai:phase", newPhase);
    onPhaseEnter(mob, ctx, newPhase);
    return; // skip attack this tick — phase burst counts as the action
  }

  // ── Attack dispatch ───────────────────────────────────────────────────────
  if (system.currentTick < globalCd) return; // global inter-attack gap
  const target = getMainTarget(mob, ctx, 24);
  if (!target) return; // no valid target in facing direction

  const loc = mob.location;
  const tdx = target.location.x - loc.x;
  const tdz = target.location.z - loc.z;
  const targetDist = Math.sqrt(tdx * tdx + tdz * tdz);

  const attack = selectAttack(phase, lastAttack, targetDist, attackCds);
  if (!attack) return; // no attack ready at this range

  const fn = ATTACK_FNS[attack];
  if (!fn) return;

  fn(mob, ctx, target);
  mob.setDynamicProperty("ai:last_attack", attack);
  mob.setDynamicProperty(`ai:${attack}_cd`, system.currentTick + ATTACK_COOLDOWNS[attack]);
  mob.setDynamicProperty("ai:global_cd", system.currentTick + GLOBAL_ATTACK_CD);
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK STUBS — fill in per attack
// ─────────────────────────────────────────────────────────────────────────────

function executeThunderslap(mob: Entity, ctx: AIContext, _target: Entity): void {
  mob.setProperty("rune:is_thunderslap", true);

  // Hit frame: sonic_boom body peaks at 1.9167s ≈ 38 ticks
  system.runTimeout(() => {
    try {
      const loc = mob.location;

      const nearby = getCombatTargets(mob, ctx, 6);

      for (const target of nearby) {
        const dx = target.location.x - loc.x;
        const dz = target.location.z - loc.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        if (target instanceof Player) {
          target.applyKnockback(dx / len, dz / len, 2.5, 0.5);
        } else {
          target.applyImpulse({ x: (dx / len) * 2.5, y: 0.5, z: (dz / len) * 2.5 });
        }
      }

      // Real lightning — hits everything, then heal guardian back for self-damage
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

function executeVoidSlices(mob: Entity, ctx: AIContext, target: Entity): void {
  mob.setProperty("rune:is_void_slices", true);

  const loc = mob.location;
  const spawned: Entity[] = [];

  // Spread 3 slices in a fan toward the target (-30°, 0°, +30°)
  const dx = target.location.x - loc.x;
  const dz = target.location.z - loc.z;
  const baseAngle = Math.atan2(dz, dx);
  for (let i = 0; i < 3; i++) {
    const angle = baseAngle + (i - 1) * (Math.PI / 6);
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

function executeFireBreath(mob: Entity, ctx: AIContext, target: Entity): void {
  mob.setProperty("rune:is_fire_breath", true);

  // Direction is mob → target on XZ plane, NOT view direction.
  // This ensures the breath always aims at the actual target regardless of
  // whether the guardian has fully rotated to face it yet.
  const mobLoc = mob.location;
  const dx0 = target.location.x - mobLoc.x;
  const dz0 = target.location.z - mobLoc.z;
  const len0 = Math.sqrt(dx0 * dx0 + dz0 * dz0) || 1;
  const fx0 = dx0 / len0;
  const fz0 = dz0 / len0;

  // Particle fires immediately at cast time — telegraphs the attack during wind-up.
  // Uses the cast-time direction (fx0/fz0) since that's what the player sees.
  const vars = new MolangVariableMap();
  vars.setFloat("variable.dir_x", fx0);
  vars.setFloat("variable.dir_z", fz0);
  vars.setFloat("variable.scale", 1.5);   // guardian is bigger
  vars.setFloat("variable.min_size", 1.0);
  vars.setFloat("variable.max_size", 5.0); // guardian: wide spread
  vars.setFloat("variable.spawn_rate", 80); // guardian: dense, matches wider radius
  ctx.dimension.spawnParticle("rune:fire_breath", mobLoc, vars);

  // Snapshot target id — re-resolve at hit frame so the cone tracks movement.
  const targetId = target.id;

  // Roar animation: body fully leans forward at 1.6s = 32 ticks — that's the breath hit
  system.runTimeout(() => {
    try {
      const loc = mob.location;

      // Re-resolve target by id to get its updated position at hit frame
      const liveTarget = ctx.dimension.getEntities({ location: loc, maxDistance: 20 })
        .find(e => e.id === targetId);

      // Compute final aim direction: prefer live target pos, fall back to snapshot
      let fx: number, fz: number;
      if (liveTarget) {
        const ddx = liveTarget.location.x - loc.x;
        const ddz = liveTarget.location.z - loc.z;
        const ddlen = Math.sqrt(ddx * ddx + ddz * ddz) || 1;
        fx = ddx / ddlen;
        fz = ddz / ddlen;
      } else {
        fx = fx0;
        fz = fz0;
      }

      const nearby = getCombatTargets(mob, ctx, 10);

      for (const e of nearby) {
        const ex = e.location.x - loc.x;
        const ez = e.location.z - loc.z;
        const elen = Math.sqrt(ex * ex + ez * ez) || 1;
        const dot = (ex / elen) * fx + (ez / elen) * fz;

        // dot > cos(50°) ≈ 0.64 → within breath cone
        if (dot > 0.64) {
          e.applyDamage(8, { cause: EntityDamageCause.fire, damagingEntity: mob });
          e.setOnFire(3, true);
        }
      }

      // Debug: particle ring showing breath reach (remove when done)
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ctx.dimension.spawnParticle("minecraft:basic_flame_particle", {
          x: loc.x + Math.cos(a) * 10,
          y: loc.y + 1,
          z: loc.z + Math.sin(a) * 10,
        });
      }
    } catch { /* ok */ }
  }, 32);

  // Reset property after roar animation ends (4.2s ≈ 84 ticks)
  system.runTimeout(() => {
    try { mob.setProperty("rune:is_fire_breath", false); } catch { /* ok */ }
  }, 84);
}

// SpellCastSystem.ts
// ─────────────────────────────────────────────────────────────────────────────
// Rune chanting + spell casting.
//
// FLOW:
//   1. Right-click a rune item      → chant (add to buffer, spawn billboard VFX)
//   2. Attack entity or block       → cast whatever is in buffer (≥ 1 rune)
//   3. Buffer auto-expires after COMBO_WINDOW_TICKS with no input
//
// CONFIG:
//   MAX_COMBO_SIZE = 2   (max runes to chant before forced cast)
//   MIN_COMBO_SIZE = 1   (min runes required to trigger a cast)
//
// DYNAMIC PROPERTIES (on player):
//   "runesystem:combo_buffer" → JSON string[]   (element names)
//   "runesystem:combo_tick"   → number          (tick of last chant)
//
// BILLBOARD VFX:
//   Spawned via spawnParticle() — no entity context, q.property() unavailable.
//   Colors passed via MolangVariableMap (variable.color_r/g/b, variable.rune_type, etc.).
// ─────────────────────────────────────────────────────────────────────────────

import {
  world,
  system,
  Player,
  Entity,
  EntityDamageCause,
  EntityHealthComponent,
  ItemUseAfterEvent,
  MolangVariableMap,
} from "@minecraft/server";
import { RuneRegistry, SpellDef, SpellEffectType } from "./RuneRegistry.js";

const COMBO_WINDOW_TICKS = 100; // 5 seconds
const MAX_COMBO_SIZE = 2;
const MIN_COMBO_SIZE = 1;

export class SpellCastSystem {
  static init(): void {
    // Chant: right-click a rune item. Cast: right-click the wand.
    world.afterEvents.itemUse.subscribe((event: ItemUseAfterEvent) => {
      if (event.itemStack?.typeId === "rune:wand") {
        SpellCastSystem.#onAttack(event.source);
      } else {
        SpellCastSystem.#onChant(event);
      }
    });

    // Cast: attack an entity or block while buffer is non-empty.
    // Dedup set prevents both events firing on the same swing (e.g. entity on a block).
    const castThisTick = new Set<string>();
    system.runInterval(() => castThisTick.clear(), 1);

    world.afterEvents.entityHitEntity.subscribe((event) => {
      if (castThisTick.has(event.damagingEntity.id)) return;
      castThisTick.add(event.damagingEntity.id);
      SpellCastSystem.#onAttack(event.damagingEntity);
    });

    world.afterEvents.entityHitBlock.subscribe((event) => {
      if (castThisTick.has(event.damagingEntity.id)) return;
      castThisTick.add(event.damagingEntity.id);
      SpellCastSystem.#onAttack(event.damagingEntity);
    });

    system.runInterval(() => {
      for (const player of world.getAllPlayers()) {
        SpellCastSystem.#tickHeldRune(player);
      }
      SpellCastSystem.#tickComboExpiry();
    }, 20);

    // Billboard follow: re-spawn at updated head position every 2 ticks
    system.runInterval(() => {
      for (const player of world.getAllPlayers()) {
        SpellCastSystem.#tickBillboard(player);
      }
    }, 2);

    console.log("[SpellCastSystem] Initialized.");
  }

  // ── Chant (right-click rune) ─────────────────────────────────────────────

  static #onChant(event: ItemUseAfterEvent): void {
    const player = event.source;
    const item = event.itemStack;
    if (!item) return;

    const rune = RuneRegistry.getRuneByItemId(item.typeId);
    if (!rune) return;

    const buffer = SpellCastSystem.#getBuffer(player);

    if (buffer.length >= MAX_COMBO_SIZE) {
      player.sendMessage("§7[Rune] Buffer full — attack to cast.");
      return;
    }

    buffer.push(rune.element);
    SpellCastSystem.#setBuffer(player, buffer, system.currentTick);

    player.sendMessage(
      `§b✦ §f${rune.display} §7[${buffer.length}/${MAX_COMBO_SIZE}] — Attack to cast`
    );
  }

  // ── Cast (attack entity or block) ────────────────────────────────────────

  static #onAttack(attacker: Entity): void {
    if (attacker.typeId !== "minecraft:player") return;
    const player = attacker as Player;

    const buffer = SpellCastSystem.#getBuffer(player);
    if (buffer.length < MIN_COMBO_SIZE) return;

    const spell = RuneRegistry.lookupSpell(buffer);
    if (spell) {
      player.sendMessage(`§6§l✦ ${spell.name}! §r§7${spell.description}`);
      SpellCastSystem.#destroyUsedRunes(player, buffer);
      SpellCastSystem.#executeSpell(player, spell);
      SpellCastSystem.#spawnCastVfx(player, buffer, spell);
    } else {
      player.sendMessage("§c[Rune] No combination found. Spell fizzled.");
    }

    SpellCastSystem.#clearBuffer(player);
  }

  // ── Cast VFX ─────────────────────────────────────────────────────────────
  // Spawns element-specific VFX when a spell fires.

  static #spawnCastVfx(player: Player, elements: string[], spell: SpellDef): void {
    if (!elements.includes("fire")) return;

    const forward = player.getViewDirection();
    const fwdLen = Math.sqrt(forward.x * forward.x + forward.z * forward.z) || 1;
    const fx = forward.x / fwdLen;
    const fz = forward.z / fwdLen;

    const isFlameBreath = spell.effectType === SpellEffectType.FIRE_BREATH;
    const vars = new MolangVariableMap();
    vars.setFloat("variable.dir_x", fx);
    vars.setFloat("variable.dir_z", fz);
    vars.setFloat("variable.scale", isFlameBreath ? 1.5 : 0.9);
    vars.setFloat("variable.min_size", isFlameBreath ? 1.5 : 1.0);
    vars.setFloat("variable.max_size", isFlameBreath ? 3.5 : 2.0);
    vars.setFloat("variable.spawn_rate", isFlameBreath ? 150 : 50);

    player.dimension.spawnParticle("rune:fire_breath", player.location, vars);
  }

  // ── Billboard Tick ───────────────────────────────────────────────────────
  // Re-spawns one short-lived particle per buffered rune every 2 ticks so the
  // billboard tracks the player's head direction continuously.

  static #tickBillboard(player: Player): void {
    const buffer = SpellCastSystem.#getBuffer(player);
    if (buffer.length === 0) return;
    for (let i = 0; i < buffer.length; i++) {
      SpellCastSystem.#spawnBillboard(player, buffer[i], i + 1, buffer.length);
    }
  }

  // ── Billboard VFX ────────────────────────────────────────────────────────
  // Spawns a particle in front of the player at eye level.
  // Slot 1 = centered, Slot 2 = offset right so both appear side-by-side.
  // Particle is static (no entity context) — replace with rune:billboard_<element>
  // files once per-element particles exist.

  static #spawnBillboard(player: Player, element: string, slot: number, chantLevel: number): void {
    const rune = RuneRegistry.getRuneByElement(element);
    const forward = player.getViewDirection();
    const loc = player.location;

    // Right-perpendicular in XZ (rotate forward 90° around Y)
    const perpX = forward.z;
    const perpZ = -forward.x;

    const sideOffset = (slot - 1) * 0.5; // 0 for slot 1, 0.5 for slot 2

    const vars = new MolangVariableMap();
    vars.setFloat("variable.color_r", rune?.colorR ?? 1.0);
    vars.setFloat("variable.color_g", rune?.colorG ?? 1.0);
    vars.setFloat("variable.color_b", rune?.colorB ?? 1.0);
    vars.setFloat("variable.rune_type", rune?.typeIndex ?? 0);
    vars.setFloat("variable.chant_level", chantLevel);
    player.dimension.spawnParticle("rune:use_particle", {
      x: loc.x + forward.x * 1.5 + perpX * sideOffset,
      y: loc.y + 1.5,
      z: loc.z + forward.z * 1.5 + perpZ * sideOffset,
    }, vars);
  }

  // ── Spell Execution ──────────────────────────────────────────────────────

  static #executeSpell(player: Player, spell: SpellDef): void {
    const dimension = player.dimension;
    const location = player.location;

    switch (spell.effectType) {

      case SpellEffectType.DAMAGE: {
        const targets = dimension.getEntities({
          location,
          maxDistance: 8,
          excludeTypes: ["minecraft:player"],
        });
        const target = SpellCastSystem.#getNearestEntity(player, targets);
        if (target) {
          target.applyDamage(spell.power, { cause: EntityDamageCause.magic, damagingEntity: player });
          player.sendMessage(`§c⚡ Hit ${target.typeId} for ${spell.power} damage.`);
        } else {
          player.sendMessage("§7No target in range.");
        }
        break;
      }

      case SpellEffectType.AOE_DAMAGE: {
        const targets = dimension.getEntities({
          location,
          maxDistance: spell.radius,
          excludeTypes: ["minecraft:player"],
        });
        let count = 0;
        for (const target of targets) {
          target.applyDamage(spell.power, { cause: EntityDamageCause.magic, damagingEntity: player });
          count++;
        }
        player.sendMessage(`§c⚡ AOE hit ${count} entities for ${spell.power} damage.`);
        break;
      }

      case SpellEffectType.HEAL: {
        const healthComp = player.getComponent("minecraft:health") as EntityHealthComponent | undefined;
        if (healthComp) {
          const newHealth = Math.min(healthComp.currentValue + spell.power, healthComp.effectiveMax);
          healthComp.setCurrentValue(newHealth);
          player.sendMessage(`§a❤ Healed for ${spell.power}. HP: ${Math.floor(newHealth)}`);
        }
        break;
      }

      case SpellEffectType.BUFF: {
        player.addEffect("resistance", spell.duration * 20, { amplifier: 1 });
        player.sendMessage(`§a✦ ${spell.name} active for ${spell.duration}s.`);
        break;
      }

      case SpellEffectType.DEBUFF: {
        const targets = dimension.getEntities({
          location,
          maxDistance: spell.radius || 4,
          excludeTypes: ["minecraft:player"],
        });
        for (const target of targets) {
          target.addEffect("slowness", spell.duration * 20, { amplifier: 2 });
          target.addEffect("weakness", spell.duration * 20, { amplifier: 1 });
        }
        player.sendMessage(`§5☠ Debuff applied to nearby enemies for ${spell.duration}s.`);
        break;
      }

      case SpellEffectType.KNOCKBACK: {
        const targets = dimension.getEntities({
          location,
          maxDistance: spell.radius,
          excludeTypes: ["minecraft:player"],
        });
        for (const target of targets) {
          const dx = target.location.x - location.x;
          const dz = target.location.z - location.z;
          const dist = Math.sqrt(dx * dx + dz * dz) || 1;
          target.applyKnockback(dx / dist, dz / dist, spell.power * 0.4, 0.4);
        }
        player.sendMessage("§e⚡ Knockback launched entities.");
        break;
      }

      case SpellEffectType.FIRE_BREATH: {
        const forward = player.getViewDirection();
        const targets = dimension.getEntities({
          location,
          maxDistance: spell.radius,
          excludeTypes: ["minecraft:player"],
        });
        let count = 0;
        for (const target of targets) {
          const dx = target.location.x - location.x;
          const dy = target.location.y - location.y;
          const dz = target.location.z - location.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          const dot = (forward.x * dx + forward.y * dy + forward.z * dz) / dist;
          if (dot > 0.3) { // ~72° cone
            target.applyDamage(spell.power, { cause: EntityDamageCause.fire, damagingEntity: player });
            count++;
          }
        }
        player.sendMessage(`§c🔥 Flame Breath scorched ${count} target${count !== 1 ? "s" : ""}!`);
        break;
      }

      default:
        player.sendMessage(`§7[Spell] '${spell.effectType}' not yet implemented.`);
    }
  }

  // ── Held Rune Sync ───────────────────────────────────────────────────────
  // Spawns held ambient particle every 20 ticks with color passed via
  // MolangVariableMap. active_time: 1.1s slightly overlaps the 1s interval.

  static #tickHeldRune(player: Player): void {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv) return;
    const item = inv.container?.getItem(player.selectedSlotIndex);
    const rune = item ? RuneRegistry.getRuneByItemId(item.typeId) : null;
    if (!rune) return;

    const vars = new MolangVariableMap();
    vars.setFloat("variable.color_r", rune.colorR);
    vars.setFloat("variable.color_g", rune.colorG);
    vars.setFloat("variable.color_b", rune.colorB);
    player.dimension.spawnParticle("rune:held_particle", {
      x: player.location.x,
      y: player.location.y + 1.0,
      z: player.location.z,
    }, vars);
  }

  // ── Combo Expiry ─────────────────────────────────────────────────────────

  static #tickComboExpiry(): void {
    const currentTick = system.currentTick;
    for (const player of world.getAllPlayers()) {
      const timestamp = SpellCastSystem.#getBufferTimestamp(player);
      if (timestamp === 0) continue;
      if (currentTick - timestamp > COMBO_WINDOW_TICKS) {
        if (SpellCastSystem.#getBuffer(player).length > 0) {
          player.sendMessage("§7[Rune] Combo window expired.");
          SpellCastSystem.#clearBuffer(player);
        }
      }
    }
  }

  // ── Item Destruction ─────────────────────────────────────────────────────
  // Removes one item per rune element used in the buffer from the player's inventory.

  static #destroyUsedRunes(player: Player, buffer: string[]): void {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv?.container) return;
    const container = inv.container;
    const toConsume = [...buffer];
    for (let slot = 0; slot < container.size && toConsume.length > 0; slot++) {
      const item = container.getItem(slot);
      if (!item) continue;
      const rune = RuneRegistry.getRuneByItemId(item.typeId);
      if (!rune) continue;
      const idx = toConsume.indexOf(rune.element);
      if (idx === -1) continue;
      toConsume.splice(idx, 1);
      if (item.amount <= 1) {
        container.setItem(slot, undefined);
      } else {
        item.amount--;
        container.setItem(slot, item);
      }
    }
  }

  // ── Dynamic Property Helpers ─────────────────────────────────────────────

  static #getBuffer(player: Player): string[] {
    try {
      const raw = player.getDynamicProperty("runesystem:combo_buffer") as string | undefined;
      return raw ? JSON.parse(raw) as string[] : [];
    } catch {
      return [];
    }
  }

  static #setBuffer(player: Player, buffer: string[], tick: number): void {
    player.setDynamicProperty("runesystem:combo_buffer", JSON.stringify(buffer));
    player.setDynamicProperty("runesystem:combo_tick", tick);
  }

  static #clearBuffer(player: Player): void {
    player.setDynamicProperty("runesystem:combo_buffer", "[]");
    player.setDynamicProperty("runesystem:combo_tick", 0);
  }

  static #getBufferTimestamp(player: Player): number {
    return (player.getDynamicProperty("runesystem:combo_tick") as number | undefined) ?? 0;
  }

  // ── Utility ──────────────────────────────────────────────────────────────

  static #getNearestEntity(player: Player, entities: Entity[]): Entity | null {
    let nearest: Entity | null = null;
    let nearestDist = Infinity;
    const origin = player.location;
    for (const entity of entities) {
      const dx = entity.location.x - origin.x;
      const dy = entity.location.y - origin.y;
      const dz = entity.location.z - origin.z;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < nearestDist) { nearestDist = dist; nearest = entity; }
    }
    return nearest;
  }
}

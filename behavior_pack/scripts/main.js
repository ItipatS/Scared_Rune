var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

// behavior_pack/scripts/main.ts
import { world as world3, system as system3 } from "@minecraft/server";

// behavior_pack/scripts/systems/RuneRegistry.ts
var SpellEffectType = {
  DAMAGE: "damage",
  HEAL: "heal",
  BUFF: "buff",
  DEBUFF: "debuff",
  AOE_DAMAGE: "aoe_damage",
  SUMMON: "summon",
  KNOCKBACK: "knockback"
};
var RUNES = {
  fire: { id: "rune:fire", element: "fire", display: "Fire Rune", typeIndex: 0, colorR: 1, colorG: 0.2, colorB: 0.1 },
  lightning: { id: "rune:lightning", element: "lightning", display: "Lightning Rune", typeIndex: 1, colorR: 0.9, colorG: 0.8, colorB: 0.1 },
  water: { id: "rune:water", element: "water", display: "Water Rune", typeIndex: 2, colorR: 0.1, colorG: 0.5, colorB: 1 },
  healing: { id: "rune:healing", element: "healing", display: "Healing Rune", typeIndex: 3, colorR: 0.2, colorG: 0.9, colorB: 0.7 },
  earth: { id: "rune:earth", element: "earth", display: "Earth Rune", typeIndex: 4, colorR: 0.3, colorG: 0.7, colorB: 0.2 },
  shadow: { id: "rune:shadow", element: "shadow", display: "Shadow Rune", typeIndex: 5, colorR: 0.5, colorG: 0.2, colorB: 0.9 },
  wind: { id: "rune:wind", element: "wind", display: "Wind Rune", typeIndex: 6, colorR: 0.7, colorG: 0.9, colorB: 1 }
};
var SPELL_COMBINATIONS = {
  // ── 1-Rune Spells ──
  "fire": {
    name: "Ember",
    effectType: SpellEffectType.DAMAGE,
    power: 4,
    radius: 0,
    duration: 0,
    description: "A small burst of flame singes your target."
  },
  "lightning": {
    name: "Spark",
    effectType: SpellEffectType.DAMAGE,
    power: 5,
    radius: 0,
    duration: 0,
    description: "A jolt of electricity strikes your target."
  },
  "water": {
    name: "Chill",
    effectType: SpellEffectType.DEBUFF,
    power: 0,
    radius: 3,
    duration: 4,
    description: "A wave of cold slows nearby enemies."
  },
  "healing": {
    name: "Mend",
    effectType: SpellEffectType.HEAL,
    power: 5,
    radius: 0,
    duration: 0,
    description: "A gentle pulse of healing energy."
  },
  "earth": {
    name: "Fortify",
    effectType: SpellEffectType.BUFF,
    power: 0,
    radius: 0,
    duration: 5,
    description: "Stone hardens your skin briefly."
  },
  "shadow": {
    name: "Curse",
    effectType: SpellEffectType.DEBUFF,
    power: 0,
    radius: 3,
    duration: 5,
    description: "Dark energy weakens nearby foes."
  },
  "wind": {
    name: "Gust",
    effectType: SpellEffectType.KNOCKBACK,
    power: 3,
    radius: 3,
    duration: 0,
    description: "A burst of wind pushes enemies back."
  },
  // ── 2-Rune Spells ──
  "fire+lightning": {
    name: "Flame Zap",
    effectType: SpellEffectType.DAMAGE,
    power: 8,
    radius: 0,
    duration: 0,
    description: "A bolt of electrified fire strikes your target."
  },
  "fire+wind": {
    name: "Firestorm",
    effectType: SpellEffectType.AOE_DAMAGE,
    power: 5,
    radius: 5,
    duration: 0,
    description: "A spinning vortex of fire scorches nearby enemies."
  },
  "healing+water": {
    name: "Healing Cleanse",
    effectType: SpellEffectType.HEAL,
    power: 10,
    radius: 0,
    duration: 0,
    description: "Purifying water restores health and clears debuffs."
  },
  "earth+shadow": {
    name: "Cursed Ground",
    effectType: SpellEffectType.DEBUFF,
    power: 3,
    radius: 4,
    duration: 10,
    description: "Corrupted earth slows and weakens all who stand on it."
  },
  "lightning+wind": {
    name: "Thunder Rush",
    effectType: SpellEffectType.KNOCKBACK,
    power: 6,
    radius: 3,
    duration: 0,
    description: "A thunderous shockwave launches enemies away."
  },
  "shadow+fire": {
    name: "Soul Burn",
    effectType: SpellEffectType.DEBUFF,
    power: 4,
    radius: 0,
    duration: 8,
    description: "Dark flames eat at the soul, dealing damage over time."
  },
  "healing+earth": {
    name: "Nature's Shield",
    effectType: SpellEffectType.BUFF,
    power: 5,
    radius: 0,
    duration: 15,
    description: "Stone and moss form a protective barrier."
  },
  // ── 3-Rune Spells (more powerful) ──
  "fire+lightning+wind": {
    name: "Storm Surge",
    effectType: SpellEffectType.AOE_DAMAGE,
    power: 14,
    radius: 8,
    duration: 0,
    description: "A cataclysmic storm of fire and lightning."
  },
  "healing+water+earth": {
    name: "Rejuvenation",
    effectType: SpellEffectType.HEAL,
    power: 25,
    radius: 6,
    duration: 0,
    description: "Nature's full power restores all allies nearby."
  },
  "shadow+fire+lightning": {
    name: "Void Strike",
    effectType: SpellEffectType.DAMAGE,
    power: 20,
    radius: 0,
    duration: 0,
    description: "Pure annihilation channeled from the void."
  }
};
var RuneRegistry = class {
  static init() {
    console.log(`[RuneRegistry] Loaded ${Object.keys(RUNES).length} runes.`);
    console.log(`[RuneRegistry] Loaded ${Object.keys(SPELL_COMBINATIONS).length} spell combinations.`);
  }
  static lookupSpell(elements) {
    const key = [...elements].sort().join("+");
    return SPELL_COMBINATIONS[key] ?? null;
  }
  static getRuneByItemId(itemId) {
    return Object.values(RUNES).find((r) => r.id === itemId) ?? null;
  }
  static getRuneByElement(element) {
    return RUNES[element] ?? null;
  }
  static debugDump() {
    for (const [key, spell] of Object.entries(SPELL_COMBINATIONS)) {
      console.log(`  [${key}] \u2192 ${spell.name} (${spell.effectType}, power: ${spell.power})`);
    }
  }
};

// behavior_pack/scripts/systems/SpellCastSystem.ts
import {
  world,
  system,
  EntityDamageCause,
  MolangVariableMap
} from "@minecraft/server";
var COMBO_WINDOW_TICKS = 100;
var MAX_COMBO_SIZE = 2;
var MIN_COMBO_SIZE = 1;
var _onChant, onChant_fn, _onAttack, onAttack_fn, _spawnCastVfx, spawnCastVfx_fn, _tickBillboard, tickBillboard_fn, _spawnBillboard, spawnBillboard_fn, _executeSpell, executeSpell_fn, _tickHeldRune, tickHeldRune_fn, _tickComboExpiry, tickComboExpiry_fn, _getBuffer, getBuffer_fn, _setBuffer, setBuffer_fn, _clearBuffer, clearBuffer_fn, _getBufferTimestamp, getBufferTimestamp_fn, _getNearestEntity, getNearestEntity_fn;
var _SpellCastSystem = class _SpellCastSystem {
  static init() {
    world.afterEvents.itemUse.subscribe((event) => {
      var _a;
      __privateMethod(_a = _SpellCastSystem, _onChant, onChant_fn).call(_a, event);
    });
    world.afterEvents.entityHitEntity.subscribe((event) => {
      var _a;
      __privateMethod(_a = _SpellCastSystem, _onAttack, onAttack_fn).call(_a, event.damagingEntity);
    });
    world.afterEvents.entityHitBlock.subscribe((event) => {
      var _a;
      __privateMethod(_a = _SpellCastSystem, _onAttack, onAttack_fn).call(_a, event.damagingEntity);
    });
    system.runInterval(() => {
      var _a, _b;
      for (const player of world.getAllPlayers()) {
        __privateMethod(_a = _SpellCastSystem, _tickHeldRune, tickHeldRune_fn).call(_a, player);
      }
      __privateMethod(_b = _SpellCastSystem, _tickComboExpiry, tickComboExpiry_fn).call(_b);
    }, 20);
    system.runInterval(() => {
      var _a;
      for (const player of world.getAllPlayers()) {
        __privateMethod(_a = _SpellCastSystem, _tickBillboard, tickBillboard_fn).call(_a, player);
      }
    }, 2);
    console.log("[SpellCastSystem] Initialized.");
  }
};
_onChant = new WeakSet();
onChant_fn = function(event) {
  var _a, _b;
  const player = event.source;
  const item = event.itemStack;
  if (!item)
    return;
  const rune = RuneRegistry.getRuneByItemId(item.typeId);
  if (!rune)
    return;
  const buffer = __privateMethod(_a = _SpellCastSystem, _getBuffer, getBuffer_fn).call(_a, player);
  if (buffer.length >= MAX_COMBO_SIZE) {
    player.sendMessage("\xA77[Rune] Buffer full \u2014 attack to cast.");
    return;
  }
  buffer.push(rune.element);
  __privateMethod(_b = _SpellCastSystem, _setBuffer, setBuffer_fn).call(_b, player, buffer, system.currentTick);
  player.sendMessage(
    `\xA7b\u2726 \xA7f${rune.display} \xA77[${buffer.length}/${MAX_COMBO_SIZE}] \u2014 Attack to cast`
  );
};
_onAttack = new WeakSet();
onAttack_fn = function(attacker) {
  var _a, _b, _c, _d;
  if (attacker.typeId !== "minecraft:player")
    return;
  const player = attacker;
  const buffer = __privateMethod(_a = _SpellCastSystem, _getBuffer, getBuffer_fn).call(_a, player);
  if (buffer.length < MIN_COMBO_SIZE)
    return;
  const spell = RuneRegistry.lookupSpell(buffer);
  if (spell) {
    player.sendMessage(`\xA76\xA7l\u2726 ${spell.name}! \xA7r\xA77${spell.description}`);
    __privateMethod(_b = _SpellCastSystem, _executeSpell, executeSpell_fn).call(_b, player, spell);
    __privateMethod(_c = _SpellCastSystem, _spawnCastVfx, spawnCastVfx_fn).call(_c, player, buffer);
  } else {
    player.sendMessage("\xA7c[Rune] No combination found. Spell fizzled.");
  }
  __privateMethod(_d = _SpellCastSystem, _clearBuffer, clearBuffer_fn).call(_d, player);
};
_spawnCastVfx = new WeakSet();
spawnCastVfx_fn = function(player, elements) {
  if (!elements.includes("fire"))
    return;
  const forward = player.getViewDirection();
  const fwdLen = Math.sqrt(forward.x * forward.x + forward.z * forward.z) || 1;
  const fx = forward.x / fwdLen;
  const fz = forward.z / fwdLen;
  const chantLevel = elements.length;
  const vars = new MolangVariableMap();
  vars.setFloat("variable.dir_x", fx);
  vars.setFloat("variable.dir_z", fz);
  vars.setFloat("variable.scale", 0.6 + chantLevel * 0.3);
  player.dimension.spawnParticle("rune:fire_breath", player.location, vars);
};
_tickBillboard = new WeakSet();
tickBillboard_fn = function(player) {
  var _a, _b;
  const buffer = __privateMethod(_a = _SpellCastSystem, _getBuffer, getBuffer_fn).call(_a, player);
  if (buffer.length === 0)
    return;
  for (let i = 0; i < buffer.length; i++) {
    __privateMethod(_b = _SpellCastSystem, _spawnBillboard, spawnBillboard_fn).call(_b, player, buffer[i], i + 1, buffer.length);
  }
};
_spawnBillboard = new WeakSet();
spawnBillboard_fn = function(player, element, slot, chantLevel) {
  const rune = RuneRegistry.getRuneByElement(element);
  const forward = player.getViewDirection();
  const loc = player.location;
  const perpX = forward.z;
  const perpZ = -forward.x;
  const sideOffset = (slot - 1) * 0.5;
  const vars = new MolangVariableMap();
  vars.setFloat("variable.color_r", rune?.colorR ?? 1);
  vars.setFloat("variable.color_g", rune?.colorG ?? 1);
  vars.setFloat("variable.color_b", rune?.colorB ?? 1);
  vars.setFloat("variable.rune_type", rune?.typeIndex ?? 0);
  vars.setFloat("variable.chant_level", chantLevel);
  player.dimension.spawnParticle("rune:use_particle", {
    x: loc.x + forward.x * 1.5 + perpX * sideOffset,
    y: loc.y + 1.5,
    z: loc.z + forward.z * 1.5 + perpZ * sideOffset
  }, vars);
};
_executeSpell = new WeakSet();
executeSpell_fn = function(player, spell) {
  var _a;
  const dimension = player.dimension;
  const location = player.location;
  switch (spell.effectType) {
    case SpellEffectType.DAMAGE: {
      const targets = dimension.getEntities({
        location,
        maxDistance: 8,
        excludeTypes: ["minecraft:player"]
      });
      const target = __privateMethod(_a = _SpellCastSystem, _getNearestEntity, getNearestEntity_fn).call(_a, player, targets);
      if (target) {
        target.applyDamage(spell.power, { cause: EntityDamageCause.magic, damagingEntity: player });
        player.sendMessage(`\xA7c\u26A1 Hit ${target.typeId} for ${spell.power} damage.`);
      } else {
        player.sendMessage("\xA77No target in range.");
      }
      break;
    }
    case SpellEffectType.AOE_DAMAGE: {
      const targets = dimension.getEntities({
        location,
        maxDistance: spell.radius,
        excludeTypes: ["minecraft:player"]
      });
      let count = 0;
      for (const target of targets) {
        target.applyDamage(spell.power, { cause: EntityDamageCause.magic, damagingEntity: player });
        count++;
      }
      player.sendMessage(`\xA7c\u26A1 AOE hit ${count} entities for ${spell.power} damage.`);
      break;
    }
    case SpellEffectType.HEAL: {
      const healthComp = player.getComponent("minecraft:health");
      if (healthComp) {
        const newHealth = Math.min(healthComp.currentValue + spell.power, healthComp.effectiveMax);
        healthComp.setCurrentValue(newHealth);
        player.sendMessage(`\xA7a\u2764 Healed for ${spell.power}. HP: ${Math.floor(newHealth)}`);
      }
      break;
    }
    case SpellEffectType.BUFF: {
      player.addEffect("resistance", spell.duration * 20, { amplifier: 1 });
      player.sendMessage(`\xA7a\u2726 ${spell.name} active for ${spell.duration}s.`);
      break;
    }
    case SpellEffectType.DEBUFF: {
      const targets = dimension.getEntities({
        location,
        maxDistance: spell.radius || 4,
        excludeTypes: ["minecraft:player"]
      });
      for (const target of targets) {
        target.addEffect("slowness", spell.duration * 20, { amplifier: 2 });
        target.addEffect("weakness", spell.duration * 20, { amplifier: 1 });
      }
      player.sendMessage(`\xA75\u2620 Debuff applied to nearby enemies for ${spell.duration}s.`);
      break;
    }
    case SpellEffectType.KNOCKBACK: {
      const targets = dimension.getEntities({
        location,
        maxDistance: spell.radius,
        excludeTypes: ["minecraft:player"]
      });
      for (const target of targets) {
        const dx = target.location.x - location.x;
        const dz = target.location.z - location.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        target.applyKnockback(dx / dist, dz / dist, spell.power * 0.4, 0.4);
      }
      player.sendMessage("\xA7e\u26A1 Knockback launched entities.");
      break;
    }
    default:
      player.sendMessage(`\xA77[Spell] '${spell.effectType}' not yet implemented.`);
  }
};
_tickHeldRune = new WeakSet();
tickHeldRune_fn = function(player) {
  const inv = player.getComponent("minecraft:inventory");
  if (!inv)
    return;
  const item = inv.container?.getItem(player.selectedSlotIndex);
  const rune = item ? RuneRegistry.getRuneByItemId(item.typeId) : null;
  if (!rune)
    return;
  const vars = new MolangVariableMap();
  vars.setFloat("variable.color_r", rune.colorR);
  vars.setFloat("variable.color_g", rune.colorG);
  vars.setFloat("variable.color_b", rune.colorB);
  player.dimension.spawnParticle("rune:held_particle", {
    x: player.location.x,
    y: player.location.y + 1,
    z: player.location.z
  }, vars);
};
_tickComboExpiry = new WeakSet();
tickComboExpiry_fn = function() {
  var _a, _b, _c;
  const currentTick = system.currentTick;
  for (const player of world.getAllPlayers()) {
    const timestamp = __privateMethod(_a = _SpellCastSystem, _getBufferTimestamp, getBufferTimestamp_fn).call(_a, player);
    if (timestamp === 0)
      continue;
    if (currentTick - timestamp > COMBO_WINDOW_TICKS) {
      if (__privateMethod(_b = _SpellCastSystem, _getBuffer, getBuffer_fn).call(_b, player).length > 0) {
        player.sendMessage("\xA77[Rune] Combo window expired.");
        __privateMethod(_c = _SpellCastSystem, _clearBuffer, clearBuffer_fn).call(_c, player);
      }
    }
  }
};
_getBuffer = new WeakSet();
getBuffer_fn = function(player) {
  try {
    const raw = player.getDynamicProperty("runesystem:combo_buffer");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
_setBuffer = new WeakSet();
setBuffer_fn = function(player, buffer, tick) {
  player.setDynamicProperty("runesystem:combo_buffer", JSON.stringify(buffer));
  player.setDynamicProperty("runesystem:combo_tick", tick);
};
_clearBuffer = new WeakSet();
clearBuffer_fn = function(player) {
  player.setDynamicProperty("runesystem:combo_buffer", "[]");
  player.setDynamicProperty("runesystem:combo_tick", 0);
};
_getBufferTimestamp = new WeakSet();
getBufferTimestamp_fn = function(player) {
  return player.getDynamicProperty("runesystem:combo_tick") ?? 0;
};
_getNearestEntity = new WeakSet();
getNearestEntity_fn = function(player, entities) {
  let nearest = null;
  let nearestDist = Infinity;
  const origin = player.location;
  for (const entity of entities) {
    const dx = entity.location.x - origin.x;
    const dy = entity.location.y - origin.y;
    const dz = entity.location.z - origin.z;
    const dist = dx * dx + dy * dy + dz * dz;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = entity;
    }
  }
  return nearest;
};
// ── Chant (right-click rune) ─────────────────────────────────────────────
__privateAdd(_SpellCastSystem, _onChant);
// ── Cast (attack entity or block) ────────────────────────────────────────
__privateAdd(_SpellCastSystem, _onAttack);
// ── Cast VFX ─────────────────────────────────────────────────────────────
// Spawns element-specific VFX when a spell fires.
__privateAdd(_SpellCastSystem, _spawnCastVfx);
// ── Billboard Tick ───────────────────────────────────────────────────────
// Re-spawns one short-lived particle per buffered rune every 2 ticks so the
// billboard tracks the player's head direction continuously.
__privateAdd(_SpellCastSystem, _tickBillboard);
// ── Billboard VFX ────────────────────────────────────────────────────────
// Spawns a particle in front of the player at eye level.
// Slot 1 = centered, Slot 2 = offset right so both appear side-by-side.
// Particle is static (no entity context) — replace with rune:billboard_<element>
// files once per-element particles exist.
__privateAdd(_SpellCastSystem, _spawnBillboard);
// ── Spell Execution ──────────────────────────────────────────────────────
__privateAdd(_SpellCastSystem, _executeSpell);
// ── Held Rune Sync ───────────────────────────────────────────────────────
// Spawns held ambient particle every 20 ticks with color passed via
// MolangVariableMap. active_time: 1.1s slightly overlaps the 1s interval.
__privateAdd(_SpellCastSystem, _tickHeldRune);
// ── Combo Expiry ─────────────────────────────────────────────────────────
__privateAdd(_SpellCastSystem, _tickComboExpiry);
// ── Dynamic Property Helpers ─────────────────────────────────────────────
__privateAdd(_SpellCastSystem, _getBuffer);
__privateAdd(_SpellCastSystem, _setBuffer);
__privateAdd(_SpellCastSystem, _clearBuffer);
__privateAdd(_SpellCastSystem, _getBufferTimestamp);
// ── Utility ──────────────────────────────────────────────────────────────
__privateAdd(_SpellCastSystem, _getNearestEntity);
var SpellCastSystem = _SpellCastSystem;

// behavior_pack/scripts/systems/MobAISystem.ts
import {
  world as world2,
  system as system2,
  Player as Player2,
  EntityDamageCause as EntityDamageCause2,
  GameMode,
  MolangVariableMap as MolangVariableMap2
} from "@minecraft/server";
var AI_TICK_INTERVAL = 10;
var AI_REGISTRY = {
  "ai:rune_guardian": RuneGuardianBrain
};
var _tick, tick_fn, _buildContext, buildContext_fn;
var _MobAISystem = class _MobAISystem {
  static init() {
    system2.runInterval(() => {
      var _a;
      __privateMethod(_a = _MobAISystem, _tick, tick_fn).call(_a);
    }, AI_TICK_INTERVAL);
    world2.afterEvents.entityHurt.subscribe((ev) => {
      if (ev.damageSource.damagingEntity?.typeId !== "rune:voidslice")
        return;
      if (!(ev.hurtEntity instanceof Player2))
        return;
      ev.hurtEntity.addEffect("darkness", 60, { amplifier: 0 });
    });
    world2.afterEvents.entityHurt.subscribe((ev) => {
      if (ev.hurtEntity.typeId !== "rune:voidslice")
        return;
      const health = ev.hurtEntity.getComponent("minecraft:health");
      if (health)
        health.setCurrentValue(health.effectiveMax);
    });
    console.log("[MobAISystem] Initialized. AI types:", Object.keys(AI_REGISTRY).join(", "));
  }
};
_tick = new WeakSet();
tick_fn = function() {
  var _a;
  for (const player of world2.getAllPlayers()) {
    const dimension = player.dimension;
    for (const [tag, brain] of Object.entries(AI_REGISTRY)) {
      for (const mob of dimension.getEntities({
        tags: [tag],
        location: player.location,
        maxDistance: 128
      })) {
        try {
          brain(mob, __privateMethod(_a = _MobAISystem, _buildContext, buildContext_fn).call(_a, mob, dimension));
        } catch (err) {
          console.warn(`[MobAISystem] Brain error [${tag}]: ${err}`);
        }
      }
    }
  }
};
_buildContext = new WeakSet();
buildContext_fn = function(mob, dimension) {
  const phase = mob.getDynamicProperty("ai:phase") ?? 1;
  const lastAttack = mob.getDynamicProperty("ai:last_attack") ?? "";
  const health = mob.getComponent("minecraft:health");
  const healthPct = health ? health.currentValue / health.effectiveMax : 1;
  const globalCd = mob.getDynamicProperty("ai:global_cd") ?? 0;
  const attackCds = {};
  for (const name of Object.keys(ATTACK_COOLDOWNS)) {
    attackCds[name] = mob.getDynamicProperty(`ai:cd:${name}`) ?? 0;
  }
  return { phase, healthPct, dimension, globalCd, attackCds, lastAttack };
};
__privateAdd(_MobAISystem, _tick);
__privateAdd(_MobAISystem, _buildContext);
var MobAISystem = _MobAISystem;
function computePhase(healthPct) {
  if (healthPct > 0.66)
    return 1;
  if (healthPct > 0.33)
    return 2;
  return 3;
}
function onPhaseEnter(mob, ctx, newPhase) {
  const nearby = getCombatTargets(mob, ctx, 40).filter((e) => e instanceof Player2);
  if (newPhase === 2) {
    mob.addEffect("strength", 1200, { amplifier: 1 });
    mob.addEffect("speed", 600, { amplifier: 1 });
    for (const p of nearby) {
      p.sendMessage("\xA76\xA7l! The Rune Guardian stirs \u2014 its power grows !");
      p.applyDamage(6, { cause: EntityDamageCause2.magic, damagingEntity: mob });
    }
  }
  if (newPhase === 3) {
    mob.addEffect("strength", 1200, { amplifier: 2 });
    mob.addEffect("speed", 600, { amplifier: 2 });
    mob.addEffect("resistance", 600, { amplifier: 1 });
    for (const p of nearby) {
      p.sendMessage("\xA74\xA7l\u26A0 THE RUNE GUARDIAN UNLEASHES ITS TRUE POWER \u26A0");
      p.applyDamage(10, { cause: EntityDamageCause2.magic, damagingEntity: mob });
    }
  }
}
var ATTACK_POOL = {
  1: ["thunderslap"],
  2: ["thunderslap", "void_slices"],
  3: ["fire_breath", "thunderslap", "void_slices"]
};
var ATTACK_COOLDOWNS = {
  thunderslap: 100,
  // 5s
  void_slices: 140,
  // 7s
  fire_breath: 80
  // 4s
};
var ATTACK_RANGES = {
  thunderslap: [0, 4],
  // melee only
  void_slices: [6, 24],
  // minimum 6 — projectile fan, not for point-blank
  fire_breath: [0, 8]
  // 1/3 of 24
};
var GLOBAL_ATTACK_CD = 40;
var ATTACK_FNS = {
  thunderslap: executeThunderslap,
  void_slices: executeVoidSlices,
  fire_breath: executeFireBreath
};
function getCombatTargets(mob, ctx, range) {
  const all = ctx.dimension.getEntities({ maxDistance: range, location: mob.location });
  return all.filter((e) => {
    if (e === mob)
      return false;
    if (e.typeId === "rune:voidslice")
      return false;
    if (e instanceof Player2) {
      const mode = e.getGameMode();
      return mode !== GameMode.creative && mode !== GameMode.spectator;
    }
    const health = e.getComponent("minecraft:health");
    return health !== void 0;
  });
}
function getMainTarget(mob, ctx, range) {
  const targets = getCombatTargets(mob, ctx, range);
  if (targets.length === 0)
    return void 0;
  const view = mob.getViewDirection();
  const fwdLen = Math.sqrt(view.x * view.x + view.z * view.z) || 1;
  const fx = view.x / fwdLen;
  const fz = view.z / fwdLen;
  const loc = mob.location;
  let best;
  let bestDist = Infinity;
  for (const t of targets) {
    const dx = t.location.x - loc.x;
    const dz = t.location.z - loc.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const dot = dx / dist * fx + dz / dist * fz;
    if (dot > 0.5 && dist < bestDist) {
      best = t;
      bestDist = dist;
    }
  }
  return best;
}
function selectAttack(phase, lastAttack, targetDist, attackCds) {
  const pool = (ATTACK_POOL[phase] ?? ATTACK_POOL[1]).filter((a) => {
    const [min, max] = ATTACK_RANGES[a] ?? [0, Infinity];
    return targetDist >= min && targetDist <= max;
  }).filter((a) => system2.currentTick >= (attackCds[a] ?? 0));
  if (pool.length === 0)
    return void 0;
  const candidates = pool.length > 1 ? pool.filter((a) => a !== lastAttack) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
function RuneGuardianBrain(mob, ctx) {
  if (!mob.isValid)
    return;
  const { phase, healthPct, globalCd, attackCds, lastAttack } = ctx;
  const newPhase = computePhase(healthPct);
  if (newPhase > phase) {
    mob.setDynamicProperty("ai:phase", newPhase);
    onPhaseEnter(mob, ctx, newPhase);
    return;
  }
  if (system2.currentTick < globalCd)
    return;
  const target = getMainTarget(mob, ctx, 24);
  if (!target)
    return;
  const loc = mob.location;
  const tdx = target.location.x - loc.x;
  const tdz = target.location.z - loc.z;
  const targetDist = Math.sqrt(tdx * tdx + tdz * tdz);
  const attack = selectAttack(phase, lastAttack, targetDist, attackCds);
  if (!attack)
    return;
  const fn = ATTACK_FNS[attack];
  if (!fn)
    return;
  fn(mob, ctx, target);
  mob.setDynamicProperty("ai:last_attack", attack);
  mob.setDynamicProperty(`ai:cd:${attack}`, system2.currentTick + ATTACK_COOLDOWNS[attack]);
  mob.setDynamicProperty("ai:global_cd", system2.currentTick + GLOBAL_ATTACK_CD);
}
function executeThunderslap(mob, ctx, _target) {
  mob.setProperty("rune:is_thunderslap", true);
  system2.runTimeout(() => {
    try {
      const loc = mob.location;
      const nearby = getCombatTargets(mob, ctx, 6);
      for (const target of nearby) {
        const dx = target.location.x - loc.x;
        const dz = target.location.z - loc.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        if (target instanceof Player2) {
          target.applyKnockback(dx / len, dz / len, 2.5, 0.5);
        } else {
          target.applyImpulse({ x: dx / len * 2.5, y: 0.5, z: dz / len * 2.5 });
        }
      }
      for (let i = 0; i < 3; i++) {
        ctx.dimension.spawnEntity("minecraft:lightning_bolt", {
          x: loc.x + (Math.random() - 0.5) * 8,
          y: loc.y,
          z: loc.z + (Math.random() - 0.5) * 8
        });
      }
      const health = mob.getComponent("minecraft:health");
      if (health)
        health.setCurrentValue(Math.min(health.currentValue + 15, health.effectiveMax));
    } catch {
    }
  }, 38);
  system2.runTimeout(() => {
    try {
      mob.setProperty("rune:is_thunderslap", false);
    } catch {
    }
  }, 60);
}
function executeVoidSlices(mob, ctx, target) {
  mob.setProperty("rune:is_void_slices", true);
  const loc = mob.location;
  const spawned = [];
  const dx = target.location.x - loc.x;
  const dz = target.location.z - loc.z;
  const baseAngle = Math.atan2(dz, dx);
  for (let i = 0; i < 3; i++) {
    const angle = baseAngle + (i - 1) * (Math.PI / 6);
    const dist = 4 + Math.random() * 3;
    try {
      const slice = ctx.dimension.spawnEntity("rune:voidslice", {
        x: loc.x + Math.cos(angle) * dist,
        y: loc.y + 0.5,
        // hover slightly above ground
        z: loc.z + Math.sin(angle) * dist
      });
      spawned.push(slice);
    } catch {
    }
  }
  system2.runTimeout(() => {
    try {
      mob.setProperty("rune:is_void_slices", false);
    } catch {
    }
  }, 7);
  system2.runTimeout(() => {
    for (const s of spawned) {
      try {
        s.remove();
      } catch {
      }
    }
  }, 100);
}
function executeFireBreath(mob, ctx, target) {
  mob.setProperty("rune:is_fire_breath", true);
  const mobLoc = mob.location;
  const dx0 = target.location.x - mobLoc.x;
  const dz0 = target.location.z - mobLoc.z;
  const len0 = Math.sqrt(dx0 * dx0 + dz0 * dz0) || 1;
  const fx0 = dx0 / len0;
  const fz0 = dz0 / len0;
  const vars = new MolangVariableMap2();
  vars.setFloat("variable.dir_x", fx0);
  vars.setFloat("variable.dir_z", fz0);
  vars.setFloat("variable.scale", 1.5);
  vars.setFloat("variable.min_size", 1);
  vars.setFloat("variable.max_size", 5);
  vars.setFloat("variable.spawn_rate", 80);
  ctx.dimension.spawnParticle("rune:fire_breath", mobLoc, vars);
  const targetId = target.id;
  system2.runTimeout(() => {
    try {
      const loc = mob.location;
      const liveTarget = ctx.dimension.getEntities({ location: loc, maxDistance: 20 }).find((e) => e.id === targetId);
      let fx, fz;
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
        const dot = ex / elen * fx + ez / elen * fz;
        if (dot > 0.64) {
          e.applyDamage(8, { cause: EntityDamageCause2.fire, damagingEntity: mob });
          e.setOnFire(3, true);
        }
      }
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        ctx.dimension.spawnParticle("minecraft:basic_flame_particle", {
          x: loc.x + Math.cos(a) * 10,
          y: loc.y + 1,
          z: loc.z + Math.sin(a) * 10
        });
      }
    } catch {
    }
  }, 32);
  system2.runTimeout(() => {
    try {
      mob.setProperty("rune:is_fire_breath", false);
    } catch {
    }
  }, 84);
}

// behavior_pack/scripts/main.ts
system3.run(() => {
  world3.sendMessage("\xA7a[RuneSystem] \xA7fSystems initializing...");
  RuneRegistry.init();
  SpellCastSystem.init();
  MobAISystem.init();
  world3.sendMessage("\xA7a[RuneSystem] \xA7fAll systems online.");
});
world3.afterEvents.entitySpawn.subscribe(({ entity }) => {
  if (entity.typeId === "rune:rune_guardian") {
    entity.addTag("ai:rune_guardian");
    return;
  }
  if (entity.typeId === "minecraft:warden") {
    if (Math.random() < 0.5) {
      const { location, dimension } = entity;
      system3.run(() => {
        try {
          entity.remove();
          dimension.spawnEntity("rune:rune_guardian", location);
        } catch {
        }
      });
    }
  }
});

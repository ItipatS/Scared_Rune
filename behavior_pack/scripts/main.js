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
import { world as world3 } from "@minecraft/server";

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
var _onChant, onChant_fn, _onAttack, onAttack_fn, _spawnBillboard, spawnBillboard_fn, _executeSpell, executeSpell_fn, _tickComboExpiry, tickComboExpiry_fn, _getBuffer, getBuffer_fn, _setBuffer, setBuffer_fn, _clearBuffer, clearBuffer_fn, _getBufferTimestamp, getBufferTimestamp_fn, _getNearestEntity, getNearestEntity_fn;
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
      var _a;
      __privateMethod(_a = _SpellCastSystem, _tickComboExpiry, tickComboExpiry_fn).call(_a);
    }, 20);
    console.log("[SpellCastSystem] Initialized.");
  }
};
_onChant = new WeakSet();
onChant_fn = function(event) {
  var _a, _b, _c;
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
  __privateMethod(_c = _SpellCastSystem, _spawnBillboard, spawnBillboard_fn).call(_c, player, rune.element, buffer.length);
  player.sendMessage(
    `\xA7b\u2726 \xA7f${rune.display} \xA77[${buffer.length}/${MAX_COMBO_SIZE}] \u2014 Attack to cast`
  );
};
_onAttack = new WeakSet();
onAttack_fn = function(attacker) {
  var _a, _b, _c;
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
  } else {
    player.sendMessage("\xA7c[Rune] No combination found. Spell fizzled.");
  }
  __privateMethod(_c = _SpellCastSystem, _clearBuffer, clearBuffer_fn).call(_c, player);
};
_spawnBillboard = new WeakSet();
spawnBillboard_fn = function(player, element, slot) {
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
// ── Billboard VFX ────────────────────────────────────────────────────────
// Spawns a particle in front of the player at eye level.
// Slot 1 = centered, Slot 2 = offset right so both appear side-by-side.
// Particle is static (no entity context) — replace with rune:billboard_<element>
// files once per-element particles exist.
__privateAdd(_SpellCastSystem, _spawnBillboard);
// ── Spell Execution ──────────────────────────────────────────────────────
__privateAdd(_SpellCastSystem, _executeSpell);
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
  EntityDamageCause as EntityDamageCause2
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
    console.log("[MobAISystem] Initialized. AI types:", Object.keys(AI_REGISTRY).join(", "));
  }
};
_tick = new WeakSet();
tick_fn = function() {
  var _a;
  const dimension = world2.getDimension("overworld");
  for (const [tag, brain] of Object.entries(AI_REGISTRY)) {
    for (const mob of dimension.getEntities({ tags: [tag] })) {
      try {
        brain(mob, __privateMethod(_a = _MobAISystem, _buildContext, buildContext_fn).call(_a, mob, dimension));
      } catch (err) {
        console.warn(`[MobAISystem] Brain error [${tag}]: ${err}`);
      }
    }
  }
};
_buildContext = new WeakSet();
buildContext_fn = function(mob, dimension) {
  const phase = mob.getDynamicProperty("ai:phase") ?? 1;
  const attackCd = mob.getDynamicProperty("ai:attack_cd") ?? 0;
  const lastAttack = mob.getDynamicProperty("ai:last_attack") ?? "";
  const health = mob.getComponent("minecraft:health");
  const healthPct = health ? health.currentValue / health.effectiveMax : 1;
  return { phase, healthPct, dimension, attackCd, lastAttack };
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
  const nearby = ctx.dimension.getEntities({
    type: "minecraft:player",
    maxDistance: 40,
    location: mob.location
  });
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
var ATTACK_FNS = {
  thunderslap: executeThunderslap,
  void_slices: executeVoidSlices,
  fire_breath: executeFireBreath
};
function selectAttack(phase, lastAttack) {
  const pool = ATTACK_POOL[phase] ?? ATTACK_POOL[1];
  const candidates = pool.length > 1 ? pool.filter((a) => a !== lastAttack) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
function RuneGuardianBrain(mob, ctx) {
  const { phase, healthPct, attackCd, lastAttack } = ctx;
  const newPhase = computePhase(healthPct);
  if (newPhase !== phase) {
    mob.setDynamicProperty("ai:phase", newPhase);
    onPhaseEnter(mob, ctx, newPhase);
    return;
  }
  if (system2.currentTick < attackCd)
    return;
  const attack = selectAttack(phase, lastAttack);
  const fn = ATTACK_FNS[attack];
  if (!fn)
    return;
  fn(mob, ctx);
  mob.setDynamicProperty("ai:last_attack", attack);
  mob.setDynamicProperty("ai:attack_cd", system2.currentTick + ATTACK_COOLDOWNS[attack]);
}
function executeThunderslap(mob, ctx) {
  mob.setProperty("rune:is_thunderslap", true);
  system2.runTimeout(() => {
    try {
      const loc = mob.location;
      const nearby = ctx.dimension.getEntities({
        type: "minecraft:player",
        maxDistance: 6,
        location: loc
      });
      for (const p of nearby) {
        const dx = p.location.x - loc.x;
        const dz = p.location.z - loc.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        p.applyKnockback(dx / len, dz / len, 2.5, 0.5);
        p.applyDamage(12, { cause: EntityDamageCause2.entityAttack, damagingEntity: mob });
      }
      for (let i = 0; i < 3; i++) {
        ctx.dimension.spawnEntity("minecraft:lightning_bolt", {
          x: loc.x + (Math.random() - 0.5) * 8,
          y: loc.y,
          z: loc.z + (Math.random() - 0.5) * 8
        });
      }
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
function executeVoidSlices(mob, ctx) {
  mob.setProperty("rune:is_void_slices", true);
  const loc = mob.location;
  const spawned = [];
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
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
function executeFireBreath(mob, ctx) {
  mob.setProperty("rune:is_fire_breath", true);
  system2.runTimeout(() => {
    try {
      const forward = mob.getViewDirection();
      const loc = mob.location;
      const fwdLen = Math.sqrt(forward.x * forward.x + forward.z * forward.z) || 1;
      const fx = forward.x / fwdLen;
      const fz = forward.z / fwdLen;
      const nearby = ctx.dimension.getEntities({
        type: "minecraft:player",
        maxDistance: 10,
        location: loc
      });
      for (const p of nearby) {
        const dx = p.location.x - loc.x;
        const dz = p.location.z - loc.z;
        const dlen = Math.sqrt(dx * dx + dz * dz) || 1;
        const dot = dx / dlen * fx + dz / dlen * fz;
        if (dot > 0.64) {
          p.applyDamage(8, { cause: EntityDamageCause2.fire, damagingEntity: mob });
          p.setOnFire(3, true);
        }
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
world3.sendMessage("\xA7a[RuneSystem] \xA7fSystems initializing...");
RuneRegistry.init();
SpellCastSystem.init();
MobAISystem.init();
world3.afterEvents.entitySpawn.subscribe(({ entity }) => {
  if (entity.typeId === "rune:rune_guardain") {
    entity.addTag("ai:rune_guardian");
    return;
  }
  if (entity.typeId === "minecraft:warden") {
    if (Math.random() < 0.5) {
      const { location, dimension } = entity;
      entity.remove();
      dimension.spawnEntity("rune:rune_guardain", location);
    }
  }
});
world3.sendMessage("\xA7a[RuneSystem] \xA7fAll systems online.");

// RuneRegistry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central data store for all rune definitions and spell combination recipes.
// This is the heart of the system — everything else reads from here.
//
// DESIGN INTENT:
//   Runes are items. They have an element. Combining 2+ runes triggers a spell.
//   Combination lookup is done by sorting rune element IDs and hashing to a key.
//   Adding new spells = adding a new entry to SPELL_COMBINATIONS. Nothing else.
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RuneDef {
  id: string;
  element: string;
  display: string;
  typeIndex: number;
  colorR: number;
  colorG: number;
  colorB: number;
}

export interface SpellDef {
  name: string;
  effectType: SpellEffectType;
  power: number;
  radius: number;
  duration: number;
  description: string;
}

// ── Spell Effect Types ────────────────────────────────────────────────────────
// Used as both a runtime value (SpellEffectType.DAMAGE) and a type alias.

export const SpellEffectType = {
  DAMAGE: "damage",
  HEAL: "heal",
  BUFF: "buff",
  DEBUFF: "debuff",
  AOE_DAMAGE: "aoe_damage",
  SUMMON: "summon",
  KNOCKBACK: "knockback",
  FIRE_BREATH: "fire_breath",
} as const;

export type SpellEffectType = typeof SpellEffectType[keyof typeof SpellEffectType];

// ── Rune Definitions ──────────────────────────────────────────────────────────
// Each rune maps to an in-game item identifier.
// Same base item model — only texture/sprite differs per rune.

export const RUNES: Record<string, RuneDef> = {
  fire: { id: "rune:fire", element: "fire", display: "Fire Rune", typeIndex: 0, colorR: 1.0, colorG: 0.2, colorB: 0.1 },
  lightning: { id: "rune:lightning", element: "lightning", display: "Lightning Rune", typeIndex: 1, colorR: 0.9, colorG: 0.8, colorB: 0.1 },
  water: { id: "rune:water", element: "water", display: "Water Rune", typeIndex: 2, colorR: 0.1, colorG: 0.5, colorB: 1.0 },
  healing: { id: "rune:healing", element: "healing", display: "Healing Rune", typeIndex: 3, colorR: 0.2, colorG: 0.9, colorB: 0.7 },
  earth: { id: "rune:earth", element: "earth", display: "Earth Rune", typeIndex: 4, colorR: 0.3, colorG: 0.7, colorB: 0.2 },
  shadow: { id: "rune:shadow", element: "shadow", display: "Shadow Rune", typeIndex: 5, colorR: 0.5, colorG: 0.2, colorB: 0.9 },
  wind: { id: "rune:wind", element: "wind", display: "Wind Rune", typeIndex: 6, colorR: 0.7, colorG: 0.9, colorB: 1.0 },
};

// ── Combination Registry ──────────────────────────────────────────────────────
// Key format: sorted element IDs joined by "+"
// e.g. fire + lightning → "fire+lightning"
// Order doesn't matter because we sort before lookup.

export const SPELL_COMBINATIONS: Record<string, SpellDef> = {
  // ── 1-Rune Spells ──
  "fire": {
    name: "Ember",
    effectType: SpellEffectType.DAMAGE,
    power: 4, radius: 0, duration: 0,
    description: "A small burst of flame singes your target.",
  },
  "lightning": {
    name: "Spark",
    effectType: SpellEffectType.DAMAGE,
    power: 5, radius: 0, duration: 0,
    description: "A jolt of electricity strikes your target.",
  },
  "water": {
    name: "Chill",
    effectType: SpellEffectType.DEBUFF,
    power: 0, radius: 3, duration: 4,
    description: "A wave of cold slows nearby enemies.",
  },
  "healing": {
    name: "Mend",
    effectType: SpellEffectType.HEAL,
    power: 5, radius: 0, duration: 0,
    description: "A gentle pulse of healing energy.",
  },
  "earth": {
    name: "Fortify",
    effectType: SpellEffectType.BUFF,
    power: 0, radius: 0, duration: 5,
    description: "Stone hardens your skin briefly.",
  },
  "shadow": {
    name: "Curse",
    effectType: SpellEffectType.DEBUFF,
    power: 0, radius: 3, duration: 5,
    description: "Dark energy weakens nearby foes.",
  },
  "wind": {
    name: "Gust",
    effectType: SpellEffectType.KNOCKBACK,
    power: 3, radius: 3, duration: 0,
    description: "A burst of wind pushes enemies back.",
  },

  // ── 2-Rune Spells ──
  "fire+fire": {
    name: "Flame Breath",
    effectType: SpellEffectType.FIRE_BREATH,
    power: 14, radius: 8, duration: 0,
    description: "Twin runes ignite a torrent of flames that scorches everything ahead.",
  },

  "fire+lightning": {
    name: "Flame Zap",
    effectType: SpellEffectType.DAMAGE,
    power: 8,
    radius: 0,
    duration: 0,
    description: "A bolt of electrified fire strikes your target.",
  },

  "fire+wind": {
    name: "Firestorm",
    effectType: SpellEffectType.AOE_DAMAGE,
    power: 5,
    radius: 5,
    duration: 0,
    description: "A spinning vortex of fire scorches nearby enemies.",
  },

  "healing+water": {
    name: "Healing Cleanse",
    effectType: SpellEffectType.HEAL,
    power: 10,
    radius: 0,
    duration: 0,
    description: "Purifying water restores health and clears debuffs.",
  },

  "earth+shadow": {
    name: "Cursed Ground",
    effectType: SpellEffectType.DEBUFF,
    power: 3,
    radius: 4,
    duration: 10,
    description: "Corrupted earth slows and weakens all who stand on it.",
  },

  "lightning+wind": {
    name: "Thunder Rush",
    effectType: SpellEffectType.KNOCKBACK,
    power: 6,
    radius: 3,
    duration: 0,
    description: "A thunderous shockwave launches enemies away.",
  },

  "shadow+fire": {
    name: "Soul Burn",
    effectType: SpellEffectType.DEBUFF,
    power: 4,
    radius: 0,
    duration: 8,
    description: "Dark flames eat at the soul, dealing damage over time.",
  },

  "healing+earth": {
    name: "Nature's Shield",
    effectType: SpellEffectType.BUFF,
    power: 5,
    radius: 0,
    duration: 15,
    description: "Stone and moss form a protective barrier.",
  },

  // ── 3-Rune Spells (more powerful) ──
  "fire+lightning+wind": {
    name: "Storm Surge",
    effectType: SpellEffectType.AOE_DAMAGE,
    power: 14,
    radius: 8,
    duration: 0,
    description: "A cataclysmic storm of fire and lightning.",
  },

  "healing+water+earth": {
    name: "Rejuvenation",
    effectType: SpellEffectType.HEAL,
    power: 25,
    radius: 6,
    duration: 0,
    description: "Nature's full power restores all allies nearby.",
  },

  "shadow+fire+lightning": {
    name: "Void Strike",
    effectType: SpellEffectType.DAMAGE,
    power: 20,
    radius: 0,
    duration: 0,
    description: "Pure annihilation channeled from the void.",
  },
};

// ── Registry API ──────────────────────────────────────────────────────────────

export class RuneRegistry {
  static init(): void {
    console.log(`[RuneRegistry] Loaded ${Object.keys(RUNES).length} runes.`);
    console.log(`[RuneRegistry] Loaded ${Object.keys(SPELL_COMBINATIONS).length} spell combinations.`);
  }

  static lookupSpell(elements: string[]): SpellDef | null {
    const key = [...elements].sort().join("+");
    return SPELL_COMBINATIONS[key] ?? null;
  }

  static getRuneByItemId(itemId: string): RuneDef | null {
    return Object.values(RUNES).find(r => r.id === itemId) ?? null;
  }

  static getRuneByElement(element: string): RuneDef | null {
    return RUNES[element] ?? null;
  }

  static debugDump(): void {
    for (const [key, spell] of Object.entries(SPELL_COMBINATIONS)) {
      console.log(`  [${key}] → ${spell.name} (${spell.effectType}, power: ${spell.power})`);
    }
  }
}

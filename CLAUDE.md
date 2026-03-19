# CLAUDE.md — Rune Addon (Minecraft Bedrock)

## What this project is

A Minecraft Bedrock Edition addon built as a learning project and portfolio demonstration. The core mechanic is a **rune-based spell combination system** — players collect rune items dropped from mobs and bosses, chant them in sequence, and trigger spell effects based on the combination. It is not a production addon; it exists to demonstrate systems architecture and Bedrock addon development patterns.

## Why it exists

- Learn Minecraft Bedrock addon development (Behavior Pack, Resource Pack, Script API, Molang, particles)
- Demonstrate data-driven, event-driven game systems design
- Portfolio piece showing cross-domain engineering (game dev + ECS + scripted AI)

## Developer background

Strong systems engineering background. Familiar with:
- TypeScript / JavaScript
- ECS architecture (JECS on Roblox)
- Server-authoritative simulation and networking
- Unity C# gameplay systems
- Shader/VFX work

Skip fundamentals. Go straight to architecture, tradeoffs, and Bedrock-specific constraints.

---

## Stack

| Layer | Technology |
|---|---|
| Scripting | TypeScript → compiled JS, Minecraft Script API (`@minecraft/server`) |
| Entity logic | Behavior Pack JSON (locomotion, stats, loot tables) |
| Visual logic | Resource Pack JSON (attachables, animations, render controllers) |
| Particle expressions | Molang (Bedrock's sandboxed expression language) |
| Particle authoring | Snowstorm (VS Code extension) |
| Schema validation | MCTool |
| Editor | VS Code + Claude Code |

**Bedrock Script API version**: Beta APIs enabled (required for dynamic properties and extended Script API surface).

---

## Project structure

```
behavior_pack/
  entities/          # Entity behavior JSON (rune_guardian, rune_boss)
  items/             # Rune item JSON (shared base model, texture-swapped)
  loot_tables/       # Rune drop tables
  scripts/
    RuneRegistry.js  # Data registry — rune definitions, spell combination lookup
    SpellCastSystem.js  # Combo buffer, item use events, spell effect handlers
    MobAISystem.js   # Tag-based brain dispatch, guardian + boss AI brains

resource_pack/
  attachables/       # Per-rune attachable JSON (7 rune types, shared geo)
  animations/        # Held item animation
  particles/         # Particle effect JSON (Molang-driven, property-reactive)
  textures/
    items/           # 2D sprite per rune type (inventory/ground display)
    entity/          # 3D texture per rune type (Blockbench model)
    particle/        # Particle spritesheet (rune glyphs, effects)
    models/          # Shared Blockbench geo (rune_base.geo.json)
```

---

## Core systems

### Rune system

- 7 rune types (fire, water, shadow, lightning, nature, healing, arcane — adjust as needed)
- All runes share one 3D model (`rune_base.geo.json`) with texture swapped per type via render controller
- Runes are inventory items — dropped from mobs, bosses, quests
- **No block placement** — runes are held and chanted in sequence

### Spell combination

- Player uses runes in sequence → combo buffer builds up
- Buffer is hashed (sorted element key) → looked up in `RuneRegistry`
- Matched combination triggers a spell effect handler
- Supports: damage, AOE, buff, debuff, healing, projectile, summon

### Mob AI

- Tag-based brain dispatch on a 10-tick interval
- `rune_guardian` — standard AI brain, drops random runes on death
- `rune_boss` — multi-phase brain, escalating behavior per health threshold
- Locomotion and stats live in Behavior Pack JSON; all decision logic lives in Script API

---

## Entity properties (client_sync: true)

These drive Molang expressions in particles and render controllers.

| Property | Type | Purpose |
|---|---|---|
| `rune:type` | int (0–6) | Which rune type the entity is associated with |
| `rune:chant_level` | int (0–2) | How many runes have been chanted (demo cap: 2) |
| `rune:color_r` | float (0–1) | Red channel for particle tinting |
| `rune:color_g` | float (0–1) | Green channel for particle tinting |
| `rune:color_b` | float (0–1) | Blue channel for particle tinting |

Set from TypeScript via `entity.setProperty()`. Read in Molang via `q.property('rune:*')`.

---

## Particle architecture

### Design principle

One particle file per *effect type*, not per rune type. Rune-specific appearance (color, UV sprite) is driven entirely by entity properties read via `q.property()` in Molang.

### Key Molang patterns used

```
// Color from properties (no chained ternaries needed)
q.property('rune:color_r')
q.property('rune:color_g')
q.property('rune:color_b')

// Alpha fade over lifetime
1.0 - (v.particle_age / v.particle_lifetime)

// UV offset — slides to correct glyph column per rune type
q.property('rune:type') * 32

// UV size — reveals more glyphs per chant level
q.property('rune:chant_level') * 16

// Billboard size — matches UV aspect ratio
["q.property('rune:chant_level')", 0.5]
```

### Particle files

| File | Type | Notes |
|---|---|---|
| `rune_hold.particle.json` | Dynamic, entity-attached | Ambient effect while holding/chanting. Reads all `rune:*` properties. |
| `rune_scripture.particle.json` | Dynamic, entity-attached | Billboard showing chanted rune glyphs. UV driven by `rune:type` and `rune:chant_level`. |
| `spell_[type].particle.json` | Static, spawned from Script API | Cast/impact effects. Spawned via `world.spawnParticle()`. No entity context — `q.property()` unavailable. |

### Important Molang constraint

`q.property()` only works when the particle is **attached to an entity** (via animation controller). Particles spawned via `world.spawnParticle()` from Script API have no entity context — all queries return 0. Static spell impact particles must bake their appearance into the JSON.

### UV / spritesheet layout

- Spritesheet: `textures/particle/particles.png` (custom, not vanilla)
- Texture size: 128×128
- Glyph size: 16×8 texels per rune level slot
- Each rune type occupies a 32px wide column (2 chant levels × 16px)
- UV origin per rune type: `rune:type * 32` on X axis

---

## Rune palette (TypeScript source of truth)

Color lives here — never in Molang. Convert to float RGB and push via `setProperty()`.

```typescript
const RUNE_PALETTE: Record<number, { r: number; g: number; b: number }> = {
  0: { r: 1.0, g: 0.2, b: 0.1 }, // fire
  1: { r: 0.1, g: 0.5, b: 1.0 }, // water
  2: { r: 0.5, g: 0.2, b: 0.9 }, // shadow
  3: { r: 0.9, g: 0.8, b: 0.1 }, // lightning
  4: { r: 0.2, g: 0.8, b: 0.2 }, // nature
  5: { r: 0.2, g: 0.9, b: 0.7 }, // healing
  6: { r: 0.8, g: 0.4, b: 1.0 }, // arcane
};

function applyRuneColor(entity: Entity, runeType: number) {
  const c = RUNE_PALETTE[runeType];
  entity.setProperty('rune:color_r', c.r);
  entity.setProperty('rune:color_g', c.g);
  entity.setProperty('rune:color_b', c.b);
}
```

---

## Remaining gaps (as of project start)

- [ ] Individual rune item JSON files
- [ ] Particle spritesheet texture (rune glyphs)
- [ ] Beta APIs enabled in test world
- [ ] Attachable JSON for each rune type (7 files)
- [ ] Rune scripture particle UV tuned to final spritesheet layout

---

## Scope reminder

This is a **demo addon**, not production. Cap complexity at what demonstrates the system clearly:
- Max chant level: 2
- Rune types: as many as have textures
- Spell combinations: enough to show the lookup pattern works
- Mob AI: guardian + one boss phase transition

Do not over-engineer. The goal is a working, readable demonstration of the architecture.

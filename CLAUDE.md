# CLAUDE.md — Sacred Runes Addon (Minecraft Bedrock)

## What this project is

A Minecraft Bedrock Edition addon built as a portfolio demonstration. The core mechanic is a **rune-based spell combination system** — players collect rune items, chant them in sequence, then cast by attacking. A multi-phase boss (Rune Guardian) serves as the primary encounter. Built to demonstrate full-stack Bedrock addon architecture across BP JSON, RP JSON, Script API, Molang, and particles.

## Why it exists

Portfolio piece for a Game Developer role requiring Bedrock addon + Script API experience.

## Developer background

Strong systems engineering background. Familiar with TypeScript/JavaScript, ECS architecture (JECS on Roblox), Unity C# gameplay systems, server-authoritative simulation, and shader/VFX work.

Skip fundamentals. Go straight to architecture, tradeoffs, and Bedrock-specific constraints.

---

## Stack

| Layer | Technology |
|---|---|
| Scripting | TypeScript → compiled JS via esbuild, `@minecraft/server` 1.15.0 |
| Entity logic | Behavior Pack JSON (locomotion, stats, loot tables, recipes) |
| Visual logic | Resource Pack JSON (attachables, animations, animation controllers) |
| Particle expressions | Molang + `MolangVariableMap` from Script API |
| Particle authoring | Snowstorm |
| Models | Blockbench |
| Schema validation | MCTool |

**Beta APIs enabled** — required for dynamic properties and entity properties.

---

## Project structure

```
behavior_pack/
  entities/          # rune_guardian.behavior.json, voidslice.behavior.json
  items/             # 7 rune items + wand
  loot_tables/
    entities/        # rune_guardian.json — rune drops on death
    chests/          # ancient_city.json, end_city_treasure.json — chest injection
  recipes/           # wand.recipe.json
  scripts/
    main.ts          # Bootstrap — init systems, warden → guardian replacement
    systems/
      RuneRegistry.ts    # Rune defs, spell combination table, lookup API
      SpellCastSystem.ts # Combo buffer, item use/attack events, spell execution, VFX
      MobAISystem.ts     # Tag-based brain dispatch, Rune Guardian AI

resource_pack/
  attachables/       # Per-rune attachable JSON (7 types, shared geo)
  animations/        # Held-item animation, guardian animations
  animation_controllers/  # rune_guardian.animation_controllers.json
  entity/            # rune_guardian.entity.json, voidslice.entity.json
  models/entity/     # rune.geo.json, rune_guardian.geo.json, voidslice.geo.json
  particles/
    rune_held.particle.json   # Ambient held-rune aura
    rune_use.particle.json    # Combo billboard (spawned from Script API)
    fire_breath.particle.json # Fire breath cast/impact effect
  textures/          # Item sprites, entity textures, particle spritesheet
```

---

## Rune types

| Index | Element | Color (float RGB) |
|---|---|---|
| 0 | fire | 1.0, 0.2, 0.1 |
| 1 | lightning | 0.9, 0.8, 0.1 |
| 2 | water | 0.1, 0.5, 1.0 |
| 3 | healing | 0.2, 0.9, 0.7 |
| 4 | earth | 0.3, 0.7, 0.2 |
| 5 | shadow | 0.5, 0.2, 0.9 |
| 6 | wind | 0.7, 0.9, 1.0 |

Color is defined in `RuneRegistry.ts` (`RUNES` table) — never in Molang or JSON. Passed to particles via `MolangVariableMap`.

---

## Core systems

### Spell combination (SpellCastSystem)

- Right-click a rune item → element added to combo buffer (max 2)
- Right-click wand OR attack entity/block → cast
- Buffer key: `[...elements].sort().join("+")` → lookup in `SPELL_COMBINATIONS`
- Buffer expires after 100 ticks (5s) of inactivity
- Rune items consumed on successful cast
- Attack dedup set prevents `entityHitEntity` + `entityHitBlock` both firing on same swing

Effect types: `damage`, `aoe_damage`, `heal`, `buff`, `debuff`, `knockback`, `fire_breath`

### Registry (RuneRegistry)

Single source of truth for all rune defs and spell combinations. Adding a spell = one new entry in `SPELL_COMBINATIONS`. Nothing else.

### Boss AI (MobAISystem)

- Tag-based dispatch: entities tagged `ai:rune_guardian` are processed every 10 ticks
- Locomotion/targeting/melee handled by BP JSON. Script handles phase transitions + special attacks only.
- `AIContext` built each tick from dynamic properties: phase, healthPct, globalCd, per-attack CDs, lastAttack
- Phase thresholds: >66% = 1, >33% = 2, ≤33% = 3
- Attack pool expands per phase: phase 1 = thunderslap only, phase 2 adds void_slices, phase 3 adds fire_breath
- Attack selection: filter pool by range + cooldown, avoid repeating lastAttack when alternatives exist

**Attack implementations:**

| Attack | Range | CD | Description |
|---|---|---|---|
| thunderslap | 0–4m | 200t | AoE knockback + 3 random lightning bolts at hit frame (38t delay) |
| void_slices | 0–4m | 200t | 3 voidslice entities spawned in atan2 fan toward target, despawn after 100t |
| fire_breath | 0–6m | 300t | Directional cone (dot > 0.64), target re-resolved at hit frame (32t delay) |

Global inter-attack cooldown: 200t after any attack fires.

### Warden replacement (main.ts)

On `entitySpawn`, gated on `cause === EntityInitializationCause.Spawned` (natural only — spawn eggs and `/summon` resolve to `Event` in this API version). 50% chance the warden is replaced with a Rune Guardian. Removal deferred via `system.run()` to avoid removing an entity during its own spawn event.

---

## Entity properties (Rune Guardian, client_sync: true)

Drive animation controller state transitions. Set via `entity.setProperty()` in Script.

| Property | Type | Purpose |
|---|---|---|
| `rune:is_thunderslap` | bool | Triggers thunderslap animation |
| `rune:is_fire_breath` | bool | Triggers fire breath animation |
| `rune:is_void_slices` | bool | Triggers void slices animation |

---

## Particle architecture

### Design principle

One particle file per effect type. Color and appearance driven by `variable.*` set via `MolangVariableMap` at spawn — no per-rune particle files.

### Critical Molang constraint

`q.property()` only works for particles **attached to an entity** via animation controller. Particles spawned via `world.spawnParticle()` / `dimension.spawnParticle()` from Script API have **no entity context** — `q.property()` always returns 0. All dynamic values must be passed through `MolangVariableMap` as `variable.*`.

### Particle files

| File | Spawned by | Variables accepted |
|---|---|---|
| `rune_held.particle.json` | `SpellCastSystem.#tickHeldRune()` every 20t | `color_r/g/b`, `spawn_rate`, `radius`, `size` |
| `rune_use.particle.json` | `SpellCastSystem.#tickBillboard()` every 2t | `color_r/g/b`, `rune_type`, `chant_level` |
| `fire_breath.particle.json` | `SpellCastSystem.#spawnCastVfx()`, `executeFireBreath()` | `dir_x`, `dir_z`, `scale`, `min_size`, `max_size`, `spawn_rate` |

### Billboard (rune_use) spawn position

Spawned 3 blocks forward from player, eye level + 0.2, with 0.5-block side offset per slot.

```typescript
x: loc.x + forward.x * 3 + perpX * sideOffset,
y: loc.y + 1.7,
z: loc.z + forward.z * 3 + perpZ * sideOffset,
```

3-block forward distance keeps it out of the first-person camera's near plane (avoid screen-blocking glow).

---

## Dynamic properties (runtime state)

Stored on entities via `setDynamicProperty` / `getDynamicProperty`.

**Player (SpellCastSystem):**
- `runesystem:combo_buffer` — JSON string[], current rune elements in buffer
- `runesystem:combo_tick` — tick of last chant, used for expiry

**Rune Guardian (MobAISystem):**
- `ai:phase` — current phase (1/2/3)
- `ai:last_attack` — name of last executed attack (for rotation logic)
- `ai:global_cd` — tick at which any attack is next allowed
- `ai:thunderslap_cd`, `ai:void_slices_cd`, `ai:fire_breath_cd` — per-attack ready ticks

---

---

## Script → Animation bridge pattern

Script cannot call animations directly. The bridge is:

1. Script calls `entity.setProperty("rune:is_thunderslap", true)` — a client-synced bool
2. Animation controller reads `q.property('rune:is_thunderslap')` → transitions to `active` state, plays animation
3. `q.all_animations_finished` transitions back to `default`
4. Script resets the property via `runTimeout` after the animation duration

This is the correct Bedrock pattern for script-triggered animations. Each attack has its own independent controller so they can't block each other.

---

## Script-to-animation hit frame timing

Attack hit logic is deferred via `runTimeout` to match the animation keyframe where the impact visually lands. Comments in MobAISystem document the source:

- `thunderslap`: hit at 38t — "sonic_boom body peaks at 1.9167s ≈ 38 ticks"
- `fire_breath`: hit at 32t — "Roar animation: body fully leans forward at 1.6s = 32 ticks"

This makes attacks feel responsive rather than dealing damage on cast.

---

## Voidslice entity design

Voidslice is a stationary hovering hazard, not a projectile. It uses `minecraft:area_attack` (damage by proximity, not hit detection) — 4 damage/tick, 0.5s cooldown, 0.8 range.

Key properties:
- `has_gravity: false`, `has_collision: false`, `push_through: 1` — fully ghostlike, nothing interacts with it physically
- `knockback_resistance: 1` — cannot be moved
- Immune to all damage via Script: `entityHurt` subscriber immediately restores health to max if the hurt entity is a voidslice
- Despawns via `runTimeout` after 100t (5s) — BP has no despawn logic at all

Three spawned per attack in an atan2 fan at -30°, 0°, +30° toward the target.

---

## Rune held animation (multi-bone gyroscope)

The held rune uses a 3-second looping animation with 4 bones rotating independently:

- `root_item` — sweeps through a wide arc (~180° rotation across 3s)
- `bone` — rotates to 157.5° on Z at 1s, returns by 3s
- `bone2` — rotates 345.95° on Y over 3s (nearly full spin)
- `bone3` — rotates -195° on X over 1.5s, returns

Three axes at different speeds and directions create a gyroscopic/orbiting effect. The particle emits from a named locator `rune_core` on the geo, not the entity origin.

Attachable uses `c.is_first_person` to switch between first and third person hold animations.

---

## Fire breath particle — niche details

**Gradient color tinting** (not flat color):
```json
"gradient": {
  "0.0": "#FFFFFFFF",   // white-hot core at birth
  "0.4": "#FFFF6600",   // orange mid-life
  "1.0": "#00400000"    // fades to transparent
}
```

**Direction injection via Molang**: The emitter disc offset and direction both read `variable.dir_x` / `variable.dir_z` passed from Script at spawn — the cone faces wherever the caster is aimed. Most Bedrock particles are omnidirectional; this one is fully oriented from outside.

**Particles grow with age**: `size = (0.4 + v.particle_age * 0.4) * variable.scale` — expands as they travel, natural fire spread feel.

**Fallback guard**: `variable.dir_x == 0.0 && variable.dir_z == 0.0 ? 1.0 : variable.dir_z` — if no direction is injected (zeroed), the emitter defaults to forward rather than collapsing.

---

## Loot table design

**Guardian drops** (`loot_tables/entities/rune_guardian.json`): weighted rune pool, 1–2 rolls. Shadow (10) and healing (15) are rarer than the common four (25 each). Rarity mirrors power — shadow+fire = Soul Burn, healing+water = Healing Cleanse.

**Chest injection** (`chests/ancient_city.json`, `chests/end_city_treasure.json`): Two-pool tables — pool 1 is thematic vanilla loot, pool 2 injects runes and a rare wand (weight 5). Ancient city biases toward shadow/earth/water (thematically dark); end city biases toward fire/lightning. Wand can be found as loot before ever killing a guardian.

---

## Warden → Guardian replacement

On `entitySpawn`, gated on `cause === EntityInitializationCause.Spawned` — natural spawns only. Spawn eggs and `/summon` resolve to `EntityInitializationCause.Event` in `@minecraft/server` 1.15.0 (the enum has no explicit `Command` or `SpawnEgg` variant). 50% chance the warden is replaced with a Rune Guardian at the same location. Entity removal is deferred one tick via `system.run()` — calling `entity.remove()` during its own `entitySpawn` handler throws. This is a known Bedrock Script API constraint.

---

## Darkness aura on Rune Guardian

`minecraft:mob_effect` component applies darkness to nearby players (range 20, 13s duration, 6s cooldown). Filtered to players without `invulnerable` ability — won't affect creative/op players. Purely BP-driven, no script needed.

---

## Scope

Demo addon, not production.
- Max combo size: 2 runes
- Rune types: 7
- Spell combinations: 18 (7 single-rune + 8 two-rune + 3 three-rune)
- Boss: Rune Guardian only, 3-phase

Do not over-engineer. The goal is a readable demonstration of the architecture.

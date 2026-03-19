// generate-attachables.js
// Run once with: node generate-attachables.js
// Generates resource_pack/attachables/rune_<type>.attachable.json for each rune type.
// All attachables share the same structure — only the identifier differs.
// Add new rune types to RUNE_TYPES and re-run.

import { writeFileSync } from 'fs';
import { join } from 'path';

const RUNE_TYPES = [
  'earth',
  'fire',
  'healing',
  'lightning',
  'shadow',
  'water',
  'wind',
];

function makeAttachable(type) {
  return {
    format_version: "1.10.0",
    "minecraft:attachable": {
      description: {
        identifier: `rune:${type}`,
        render_controllers: ["controller.render.item_default"],
        materials: {
          default: "entity_alphatest",
          enchanted: "entity_alphatest_glint",
        },
        textures: {
          default: "textures/entity/attachable/rune_default",
          enchanted: "textures/misc/enchanted_item_glint",
        },
        geometry: {
          default: "geometry.rune",
        },
        animations: {
          first_person_hold: "animation.rune.first_person_hold",
          third_person_hold: "animation.rune.third_person_hold",
        },
        particle_effects: {
          rune_held: "rune:held_particle",
          rune_idle: "rune:idle_particle",
          rune_chant: "rune:chant_particle",
        },
        scripts: {
          animate: [
            { first_person_hold: "c.is_first_person" },
            { third_person_hold: "!c.is_first_person" },
          ],
        },
      },
    },
  };
}

for (const type of RUNE_TYPES) {
  const outPath = join('resource_pack', 'attachables', `rune_${type}.attachable.json`);
  writeFileSync(outPath, JSON.stringify(makeAttachable(type), null, '\t') + '\n');
  console.log(`Written: ${outPath}`);
}

console.log(`Done — ${RUNE_TYPES.length} attachables generated.`);

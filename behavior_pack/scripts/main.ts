// main.ts — Entry point, bootstraps all systems
import { world } from "@minecraft/server";

import { RuneRegistry } from "./systems/RuneRegistry.js";
import { SpellCastSystem } from "./systems/SpellCastSystem.js";
import { MobAISystem } from "./systems/MobAISystem.js";

// ─── Bootstrap ────────────────────────────────────────────────────────────────

world.sendMessage("§a[RuneSystem] §fSystems initializing...");

RuneRegistry.init();
SpellCastSystem.init();
MobAISystem.init();

// ─── Entity Spawn Handling ────────────────────────────────────────────────────

world.afterEvents.entitySpawn.subscribe(({ entity }) => {
  // Tag rune guardians so MobAISystem can query them by tag
  if (entity.typeId === "rune:rune_guardain") {
    entity.addTag("ai:rune_guardian");
    return;
  }

  // 50/50 chance: replace a naturally spawned warden with a rune guardian
  if (entity.typeId === "minecraft:warden") {
    if (Math.random() < 0.5) {
      const { location, dimension } = entity;
      entity.remove();
      dimension.spawnEntity("rune:rune_guardain", location);
    }
  }
});

world.sendMessage("§a[RuneSystem] §fAll systems online.");

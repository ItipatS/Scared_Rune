// main.ts — Entry point, bootstraps all systems
import { world, system } from "@minecraft/server";
import { RuneRegistry } from "./systems/RuneRegistry.js";
import { SpellCastSystem } from "./systems/SpellCastSystem.js";
import { MobAISystem } from "./systems/MobAISystem.js";
// ─── Bootstrap ────────────────────────────────────────────────────────────────
// Deferred one tick so the world is ready before we log or init systems.
system.run(() => {
    world.sendMessage("§a[RuneSystem] §fSystems initializing...");
    RuneRegistry.init();
    SpellCastSystem.init();
    MobAISystem.init();
    world.sendMessage("§a[RuneSystem] §fAll systems online.");
});
// ─── Entity Spawn Handling ────────────────────────────────────────────────────
world.afterEvents.entitySpawn.subscribe(({ entity }) => {
    // Tag rune guardians so MobAISystem can query them by tag
    if (entity.typeId === "rune:rune_guardian") {
        entity.addTag("ai:rune_guardian");
        return;
    }
    // 50/50 chance: replace a naturally spawned warden with a rune guardian
    if (entity.typeId === "minecraft:warden") {
        if (Math.random() < 0.5) {
            const { location, dimension } = entity;
            // Defer removal — cannot call entity.remove() during entitySpawn event
            system.run(() => {
                try {
                    entity.remove();
                    dimension.spawnEntity("rune:rune_guardian", location);
                }
                catch { }
            });
        }
    }
});

import { CACHE_ASSETS, Player } from "osrs-sdk";
import type { Loadout } from "osrs-sdk";

export const colosseumLoadout: Loadout = {
  name: "Default",
  equipment: {
    weapon: CACHE_ASSETS.items.scytheOfVitur.id,
    offhand: null,
    helmet: CACHE_ASSETS.items.torvaFullHelm.id,
    necklace: CACHE_ASSETS.items.amuletOfRancour.id,
    cape: CACHE_ASSETS.items.infernalCape.id,
    ammo: CACHE_ASSETS.items.dragonArrows.id,
    chest: CACHE_ASSETS.items.oathplateChest.id,
    legs: CACHE_ASSETS.items.oathplateLegs.id,
    feet: CACHE_ASSETS.items.avernicTreadsMax.id,
    gloves: CACHE_ASSETS.items.ferociousGloves.id,
    ring: CACHE_ASSETS.items.ultorRing.id,
  },
  inventory: [
    CACHE_ASSETS.items.bladeOfSaeldor.id,
    CACHE_ASSETS.items.avernicDefender.id,
    CACHE_ASSETS.items.noxiousHalberd.id,
    CACHE_ASSETS.items.dragonClaws.id,
    CACHE_ASSETS.items.saradominBrew.id,
    CACHE_ASSETS.items.saradominBrew.id,
    CACHE_ASSETS.items.superCombatPotion.id,
    CACHE_ASSETS.items.superCombatPotion.id,
    CACHE_ASSETS.items.saradominBrew.id,
    CACHE_ASSETS.items.saradominBrew.id,
    CACHE_ASSETS.items.superRestore.id,
    CACHE_ASSETS.items.superRestore.id,
    CACHE_ASSETS.items.saradominBrew.id,
    CACHE_ASSETS.items.saradominBrew.id,
    CACHE_ASSETS.items.superRestore.id,
    CACHE_ASSETS.items.superRestore.id,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ],
};

/** Exact copy of the "Colosseum" Inventory Setup in the reference RuneLite profile (2026-09-08). */
export const v3ColosseumLoadout: Loadout = {
  name: "V3 Colosseum",
  equipment: {
    weapon: CACHE_ASSETS.items.bloodAncientSceptre.id,
    offhand: null,
    helmet: CACHE_ASSETS.items.blueMoonHelm.id,
    necklace: CACHE_ASSETS.items.amuletOfBloodFury.id,
    cape: CACHE_ASSETS.items.fireCape.id,
    ammo: CACHE_ASSETS.items.radasBlessing4.id,
    chest: CACHE_ASSETS.items.blueMoonChestplate.id,
    legs: CACHE_ASSETS.items.blueMoonTassets.id,
    feet: CACHE_ASSETS.items.avernicTreadsPrEt.id,
    gloves: CACHE_ASSETS.items.conflictionGauntlets.id,
    ring: CACHE_ASSETS.items.lightbearer.id,
  },
  inventory: [
    CACHE_ASSETS.items.abyssalTentacle.id,
    CACHE_ASSETS.items.barrowsGloves.id,
    CACHE_ASSETS.items.bowOfFaerdhinenIorwerth.id,
    CACHE_ASSETS.items.crystalBodyIorwerth.id,
    CACHE_ASSETS.items.dragonDefender.id,
    CACHE_ASSETS.items.necklaceOfRupture.id,
    CACHE_ASSETS.items.crystalHelmIorwerth.id,
    CACHE_ASSETS.items.crystalLegsIorwerth.id,
    CACHE_ASSETS.items.superCombatPotion.id,
    CACHE_ASSETS.items.superCombatPotion.id,
    CACHE_ASSETS.items.rangingPotion.id,
    CACHE_ASSETS.items.rangingPotion.id,
    CACHE_ASSETS.items.superRestore.id,
    CACHE_ASSETS.items.superRestore.id,
    CACHE_ASSETS.items.superRestore.id,
    CACHE_ASSETS.items.superRestore.id,
    CACHE_ASSETS.items.superRestore.id,
    CACHE_ASSETS.items.superRestore.id,
    CACHE_ASSETS.items.sanfewSerum.id,
    CACHE_ASSETS.items.saradominBrew.id,
    CACHE_ASSETS.items.saradominBrew.id,
    CACHE_ASSETS.items.saradominBrew.id,
    CACHE_ASSETS.items.saradominBrew.id,
    CACHE_ASSETS.items.saturatedHeart.id,
    CACHE_ASSETS.items.noxiousHalberd.id,
    CACHE_ASSETS.items.saradominGodsword.id,
    CACHE_ASSETS.items.burningClaws.id,
    CACHE_ASSETS.items.divineRunePouch.id,
  ],
};

/** Apply the Colosseum's fixed player stats and starting boost after Region.reset(). */
export function configureColosseumPlayer(player: Player) {
  player.stats.prayer = 93;
  player.currentStats.prayer = 93;
  player.stats.defence = 99;
  player.currentStats.defence = 99;

  // No auto-boost. The player starts at base stats; a super-combat boost only
  // applies if one is actually drunk from the inventory, and it drains over time.
}

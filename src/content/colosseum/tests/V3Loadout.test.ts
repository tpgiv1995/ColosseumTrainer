import "../../../../test/setupFiles";
import { loadLoadoutRegistry, Settings } from "osrs-sdk";
import { v3ColosseumLoadout, colosseumLoadout } from "../js/ColosseumLoadout";

test("the V3 loadout mirrors the RuneLite Inventory Setup", () => {
  expect(v3ColosseumLoadout.name).toBe("V3 Colosseum");
  expect(v3ColosseumLoadout.inventory).toHaveLength(28);
  expect(v3ColosseumLoadout.equipment).toEqual({
    weapon: 28260,
    offhand: null,
    helmet: 29041,
    necklace: 24780,
    cape: 6570,
    ammo: 22947,
    chest: 29037,
    legs: 29039,
    feet: 31095,
    gloves: 31106,
    ring: 25975,
  });
  expect(v3ColosseumLoadout.inventory).toEqual([
    12006, 7462, 25886, 27721, 12954, 33639, 27729, 27725,
    12695, 12695, 2444, 2444, 3024, 3024, 3024, 3024,
    3024, 3024, 10925, 6685, 6685, 6685, 6685, 27641,
    29796, 11806, 29577, 27509,
  ]);
});

test("every id in the V3 loadout resolves to an SDK item", async () => {
  const registry = await loadLoadoutRegistry();
  const ids = [...Object.values(v3ColosseumLoadout.equipment), ...v3ColosseumLoadout.inventory].filter(Boolean);
  expect(ids.filter((id) => !registry.has(id))).toEqual([]);
});

test("the V3 loadout is the default and upstream's stays available", () => {
  window.localStorage.clear();
  Settings.readFromStorage();
  expect(Settings.loadout).toBe("V3 Colosseum");
  expect(colosseumLoadout.name).toBe("Default");
});

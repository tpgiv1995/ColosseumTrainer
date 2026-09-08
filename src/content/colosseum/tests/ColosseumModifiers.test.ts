import "../../../../test/setupFiles";

import { Player, World, Viewport, TestRegion, Trainer, Projectile, MeleeWeapon } from "osrs-sdk";
import { SolHeredit } from "../js/mobs/SolHeredit";
import {
  applyColosseumModifiers,
  clampOverheal,
  ColosseumModifierState,
  DOOM_STACK_LIMIT,
  relentlessMaxHitBonus,
} from "../js/ColosseumModifiers";
import { SolGroundSlam } from "../js/entities/SolGroundSlam";

const OFF: ColosseumModifierState = { practiceMode: false, doom: 0, frailty: 0, myopia: 0, blasphemy: 0, relentless: 0 };

function setup() {
  const region = new TestRegion(30, 30) as TestRegion & { modifiers?: ReturnType<typeof applyColosseumModifiers> };
  const world = new World();
  region.world = world;
  world.addRegion(region);
  Viewport.setupViewport(region, document.createElement("canvas"), document.createElement("div"), true);
  const player = new Player(region, { x: 15, y: 15 });
  region.addPlayer(player);
  Viewport.viewport.setPlayer(player);
  Trainer.setPlayer(player);
  const boss = new SolHeredit(region, { x: 13, y: 23 }, { aggro: player });
  region.addMob(boss);
  player.currentStats.hitpoint = 99;
  player.currentStats.prayer = 93;
  return { region, world, player, boss };
}

function solHits(player: Player, boss: SolHeredit, damage: number) {
  player.addProjectile(new Projectile(new MeleeWeapon(), damage, boss, player, "stab", { hidden: true, setDelay: 0 }));
  player.attackStep();
}

describe("practice mode and modifiers", () => {
  test("practice mode caps every Sol hit at 1 or 2", () => {
    const { player, boss } = setup();
    applyColosseumModifiers(player, { ...OFF, practiceMode: true });
    for (let i = 0; i < 10; i++) solHits(player, boss, 40);
    expect(player.currentStats.hitpoint).toBeGreaterThanOrEqual(99 - 20);
    expect(player.currentStats.hitpoint).toBeLessThanOrEqual(99 - 10);
  });

  test("practice mode leaves zero hits alone and caps player-sourced hazards", () => {
    const { player, boss } = setup();
    applyColosseumModifiers(player, { ...OFF, practiceMode: true });
    solHits(player, boss, 0);
    expect(player.currentStats.hitpoint).toBe(99);
    // Lasers and sand pools are built as player-to-player typeless projectiles.
    player.addProjectile(new Projectile(null, 70, player, player, "typeless", { setDelay: 0 }));
    player.attackStep();
    expect(player.currentStats.hitpoint).toBeGreaterThanOrEqual(97);
  });

  test("doom kills at the tier's stack limit", () => {
    const { player, boss } = setup();
    const tracker = applyColosseumModifiers(player, { ...OFF, practiceMode: true, doom: 3 });
    for (let i = 0; i < DOOM_STACK_LIMIT[3] - 1; i++) solHits(player, boss, 5);
    expect(tracker.doomStacks).toBe(4);
    expect(player.currentStats.hitpoint).toBeGreaterThan(0);
    solHits(player, boss, 5);
    expect(tracker.doomStacks).toBe(5);
    expect(player.currentStats.hitpoint).toBe(0);
    expect(player.isDying()).toBe(true);
  });

  test("doom's death cannot be undone by healing queued on the same tick", () => {
    const { player, boss } = setup();
    applyColosseumModifiers(player, { ...OFF, doom: 3 });
    for (let i = 0; i < DOOM_STACK_LIMIT[3]; i++) {
      player.addProjectile(new Projectile(new MeleeWeapon(), 1, boss, player, "stab", { hidden: true, setDelay: 0 }));
    }
    player.addProjectile(new Projectile(null, -20, player, player, "heal", { setDelay: 0 }));
    player.attackStep();
    expect(player.isDying()).toBe(true);
  });

  test("frailty lowers max hitpoints and blocks overheal", () => {
    const { player } = setup();
    const state = { ...OFF, frailty: 2 as const };
    applyColosseumModifiers(player, state);
    expect(player.stats.hitpoint).toBe(79);
    expect(player.currentStats.hitpoint).toBe(79);
    player.currentStats.hitpoint = 95;
    clampOverheal(player, state);
    expect(player.currentStats.hitpoint).toBe(79);
  });

  test("myopia shortens attack range", () => {
    const { player } = setup();
    const base = player.attackRange;
    applyColosseumModifiers(player, { ...OFF, myopia: 2 });
    expect(player.attackRange).toBe(Math.max(1, base - 4));
  });

  test("blasphemy drains prayer by a share of damage", () => {
    const { player, boss } = setup();
    applyColosseumModifiers(player, { ...OFF, blasphemy: 1 });
    solHits(player, boss, 20);
    expect(player.currentStats.prayer).toBe(93 - 4);
  });

  test("relentless raises Sol's max hit at roll time, not every hit", () => {
    const { region, player, boss } = setup();
    region.modifiers = applyColosseumModifiers(player, { ...OFF, relentless: 3 });
    expect(relentlessMaxHitBonus(region)).toBe(6);
    // A plain fixed hit is unchanged by the modifier pipeline.
    solHits(player, boss, 10);
    expect(player.currentStats.hitpoint).toBe(89);
    // The ground slam roll spans 20..(44 + 6).
    const seen: number[] = [];
    for (let i = 0; i < 400; i++) {
      const slam = new SolGroundSlam(region, { x: 15, y: 15 }, boss, player, 0, 0);
      player.currentStats.hitpoint = 99;
      slam.weapon.attack(boss, player, { attackStyle: "crush" });
      player.attackStep();
      seen.push(99 - player.currentStats.hitpoint);
    }
    expect(Math.max.apply(null, seen)).toBeGreaterThan(44);
    expect(Math.max.apply(null, seen)).toBeLessThanOrEqual(50);
    expect(Math.min.apply(null, seen)).toBeGreaterThanOrEqual(20);
  });

  test("tracker HUD text names what is on", () => {
    const { player } = setup();
    const tracker = applyColosseumModifiers(player, { ...OFF, practiceMode: true, doom: 1 });
    expect(tracker.hudText()).toContain("Practice mode");
    expect(tracker.hudText()).toContain("Doom 0/15");
    expect(applyColosseumModifiers(player, OFF).hudText()).toBeNull();
  });
});

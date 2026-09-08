# Pat's Colosseum Trainer Fork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Sol Heredit Trainer fork behave like the reference RuneLite client: right-drag camera, F1..F5 bindings, his real Colosseum kit with real models, modern bottom-bar layout, settings that survive resets, hosted on Netlify and runnable locally.

**Architecture:** Two linked repos. The engine (`C:\dev\colosim\osrs-sdk`, branch `pat`) gets the camera, keybind, layout, and item changes. The trainer (`C:\dev\colosim\trainer`, branch `pat`) gets the loadout, sidebar toggle, start script, and Netlify config. The trainer consumes the engine via `npm run link:sdk` locally and via `scripts/build-beta.sh` on Netlify.

**Tech Stack:** TypeScript, webpack 5, three.js 0.163, React 18, jest 27 (ts-jest, jsdom), tsx for the Node-only cache-render scripts, Netlify CLI 27, gh CLI.

**Spec:** `docs/superpowers/specs/2026-09-08-v3-colosim-fork-design.md` (in the trainer repo).

## Global Constraints

- Node 24 is installed; the repos declare `>=16`. Do not change engines.
- Keep GPL-3.0 LICENSE files and upstream credits untouched.
- Every SDK change goes on `osrs-sdk` branch `pat`; every trainer change on `trainer` branch `pat`.
- Run SDK tests from `C:\dev\colosim\osrs-sdk` with `npx jest`; trainer tests from `C:\dev\colosim\trainer` with `npx jest`.
- Git commits: end the message with the Co-Authored-By and Claude-Session trailers used in the spec commit (`git log -1` in the trainer shows them).
- Windows shell: run npm and git through the Bash tool (Git Bash paths `/c/dev/colosim/...`).
- Wiki bonuses are copied verbatim from the spec and this plan; do not "correct" them from memory.
- Item ids for Pat's kit are the ids in his Inventory Setup (spec section 3), even where the wiki lists a different base id.

---

### Task 1: Link the SDK fork into the trainer and prove the baseline is green

**Files:**
- Modify: `C:\dev\colosim\trainer\package.json` (no dependency change; link only)
- Create: `C:\dev\colosim\start.cmd`

**Interfaces:**
- Produces: a working `npm run link:sdk` and a passing jest baseline in both repos that every later task re-runs.

- [ ] **Step 1: Build the SDK and its React package, then link them into the trainer**

Run:
```bash
cd /c/dev/colosim/trainer && npm run link:sdk 2>&1 | tail -15
ls -la node_modules/osrs-sdk node_modules/osrs-sdk-react | head -4
```
Expected: both entries are symlinks (junctions) into `C:\dev\colosim\osrs-sdk`. If `link:sdk` fails on the React package, run `cd /c/dev/colosim/osrs-sdk/packages/osrs-sdk-react && npm run build` and rerun.

- [ ] **Step 2: Run the SDK test suite**

Run: `cd /c/dev/colosim/osrs-sdk && npx jest 2>&1 | tail -8`
Expected: all suites pass. Record the suite and test counts in the commit message of Step 5.

- [ ] **Step 3: Run the trainer test suite against the linked SDK**

Run: `cd /c/dev/colosim/trainer && npx jest 2>&1 | tail -8`
Expected: Sol32, SolAttack, SolMovement pass. If jest resolves `osrs-sdk` to the symlink and complains about ESM, uncomment the `"osrs-sdk": require.resolve("osrs-sdk")` line in `jest.config.js` moduleNameMapper.

- [ ] **Step 4: Create the local start script**

Write `C:\dev\colosim\start.cmd`:
```bat
@echo off
rem Sol Heredit Trainer, V3 fork. Serves the cache-render bundle on 8081 and the trainer on 8000.
start "colosim assets" cmd /k "cd /d C:\dev\colosim\osrs-sdk && npm run serve:assets"
cd /d C:\dev\colosim\trainer
set OSRS_ASSET_BASE_URL=https://assets-soltrainer.netlify.app
set OSRS_CACHE_RENDER_MANIFEST_URL=http://127.0.0.1:8081/manifest.json
npm run start
```

- [ ] **Step 5: Commit (trainer only; start.cmd lives outside both repos, nothing to commit there)**

Nothing in the trainer changed unless Step 3 edited `jest.config.js`. If it did:
```bash
cd /c/dev/colosim/trainer && git add jest.config.js && git commit -m "test: resolve linked osrs-sdk in jest"
```

---

### Task 2: V3 keybind defaults, same-key panel toggle, Prayer 93

**Files:**
- Modify: `C:\dev\colosim\osrs-sdk\src\sdk\Settings.ts` (`createDefaults`, lines ~215-245)
- Modify: `C:\dev\colosim\osrs-sdk\src\sdk\ControlPanelController.ts` (keydown listener, lines ~99-113)
- Modify: `C:\dev\colosim\trainer\src\content\colosseum\js\ColosseumLoadout.ts` (`configureColosseumPlayer`)
- Test: `C:\dev\colosim\osrs-sdk\test\sdk\PatDefaults.test.ts`
- Test: `C:\dev\colosim\osrs-sdk\test\sdk\ControlPanelToggle.test.ts`

**Interfaces:**
- Produces: `Settings` defaults `combat_key="F1"`, `inventory_key="F2"`, `prayer_key="F3"`, `spellbook_key="F4"`, `equipment_key="F5"`. `ControlPanelController.selectedControl` becomes `null` when the open panel's key is pressed again.

- [ ] **Step 1: Write the failing defaults test**

`test/sdk/PatDefaults.test.ts`:
```ts
import { Settings, SETTINGS_STORAGE_KEY } from "../../src/sdk/Settings";

describe("V3 keybind defaults", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Settings.readFromStorage();
  });

  test("F1..F5 map to combat, inventory, prayer, magic, equipment", () => {
    expect(Settings.combat_key).toBe("F1");
    expect(Settings.inventory_key).toBe("F2");
    expect(Settings.prayer_key).toBe("F3");
    expect(Settings.spellbook_key).toBe("F4");
    expect(Settings.equipment_key).toBe("F5");
  });

  test("defaults survive a persist and reload cycle", () => {
    Settings.persistToStorage();
    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY));
    expect(stored.values.combat_key).toBe("F1");
    Settings.readFromStorage();
    expect(Settings.equipment_key).toBe("F5");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd /c/dev/colosim/osrs-sdk && npx jest test/sdk/PatDefaults.test.ts 2>&1 | tail -15`
Expected: FAIL, `Expected: "F1" Received: "F5"`.

- [ ] **Step 3: Change the defaults**

In `createDefaults()` in `src/sdk/Settings.ts` replace the five key lines:
```ts
    combat_key: "F1",
    equipment_key: "F5",
    inventory_key: "F2",
    prayer_key: "F3",
    spellbook_key: "F4",
```
(Keep the object's alphabetical order; each key stays where it is, only the value changes.)

- [ ] **Step 4: Run the defaults test, expect PASS**

Run: `cd /c/dev/colosim/osrs-sdk && npx jest test/sdk/PatDefaults.test.ts 2>&1 | tail -8`

- [ ] **Step 5: Write the failing toggle test**

`test/sdk/ControlPanelToggle.test.ts` (the global setup mocks ControlPanelController, so unmock it here first):
```ts
jest.unmock("../../src/sdk/ControlPanelController");

import { ControlPanelController } from "../../src/sdk/ControlPanelController";
import { Settings } from "../../src/sdk/Settings";

function press(key: string) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

describe("panel hotkeys toggle like RuneLite's modern layout", () => {
  let controller: ControlPanelController;

  beforeAll(() => {
    window.localStorage.clear();
    Settings.readFromStorage();
    controller = new ControlPanelController();
    ControlPanelController.controller = controller;
  });

  test("pressing the inventory key opens the inventory", () => {
    press("F2");
    expect(controller.selectedControl).toBe(ControlPanelController.controls.INVENTORY);
  });

  test("pressing it again closes the panel", () => {
    press("F2");
    expect(controller.selectedControl).toBeNull();
  });

  test("a different key switches panels instead of closing", () => {
    press("F2");
    press("F3");
    expect(controller.selectedControl).toBe(ControlPanelController.controls.PRAYER);
  });
});
```
If the constructor throws because a control needs a DOM element, look at the failing control's constructor and stub the element with `document.body.appendChild(...)` inside `beforeAll`; do not mock the controller.

- [ ] **Step 6: Run it to verify it fails**

Run: `cd /c/dev/colosim/osrs-sdk && npx jest test/sdk/ControlPanelToggle.test.ts 2>&1 | tail -15`
Expected: the second test fails (`selectedControl` is still INVENTORY).

- [ ] **Step 7: Implement the toggle**

In `src/sdk/ControlPanelController.ts` replace the body of the `forEach` inside the keydown listener:
```ts
      this.controls.forEach((control) => {
        if (control.keyBinding === event.key) {
          // RuneLite modern layout: the hotkey of the open panel closes it.
          this.selectedControl = this.selectedControl === control ? null : control;
          event.preventDefault();
        }
      });
```

- [ ] **Step 8: Run the toggle test and the whole SDK suite**

Run: `cd /c/dev/colosim/osrs-sdk && npx jest 2>&1 | tail -8`
Expected: PASS. If `draw` or click handlers crash on a `null` selectedControl, they already guard with `if (this.selectedControl)` (see lines ~181, 225, 278); confirm by grepping `selectedControl.` for unguarded uses and add `if (!this.selectedControl) return false;` where missing.

- [ ] **Step 9: Set Pat's Prayer level in the trainer**

In `trainer/src/content/colosseum/js/ColosseumLoadout.ts`, `configureColosseumPlayer`, change both prayer lines:
```ts
  player.stats.prayer = 93;
  player.currentStats.prayer = 93;
```

- [ ] **Step 10: Run trainer tests, then commit both repos**

Run: `cd /c/dev/colosim/trainer && npx jest 2>&1 | tail -6`
```bash
cd /c/dev/colosim/osrs-sdk && git add src/sdk/Settings.ts src/sdk/ControlPanelController.ts test/sdk/PatDefaults.test.ts test/sdk/ControlPanelToggle.test.ts && git commit -m "feat: Pat's F1-F5 panel defaults and same-key panel toggle"
cd /c/dev/colosim/trainer && git add src/content/colosseum/js/ColosseumLoadout.ts && git commit -m "feat: Pat's prayer level 93"
```

---

### Task 3: Right-drag camera

**Files:**
- Create: `C:\dev\colosim\osrs-sdk\src\sdk\utils\RightClickGesture.ts`
- Modify: `C:\dev\colosim\osrs-sdk\src\sdk\ClickController.ts` (`clickDown` ~228, `leftClickUp` ~74, `registerClickActions` ~41)
- Modify: `C:\dev\colosim\osrs-sdk\src\sdk\Viewport3d.ts` (`onDocumentMouseMove` ~182)
- Test: `C:\dev\colosim\osrs-sdk\test\sdk\RightClickGesture.test.ts`

**Interfaces:**
- Produces: `RightClickGesture` class with `begin(x, y)`, `end(x, y): "click" | "drag" | "none"`, `isDragging(x, y): boolean`, constant `DRAG_THRESHOLD_PX = 4`. `Viewport3d` rotates when `(e.buttons & 2) === 2` and `!Viewport.viewport.contextMenu.isActive`.

- [ ] **Step 1: Write the failing gesture test**

`test/sdk/RightClickGesture.test.ts`:
```ts
import { RightClickGesture, DRAG_THRESHOLD_PX } from "../../src/sdk/utils/RightClickGesture";

describe("right mouse gesture classification", () => {
  test("press and release in place is a click", () => {
    const g = new RightClickGesture();
    g.begin(100, 100);
    expect(g.end(101, 100)).toBe("click");
  });

  test("moving past the threshold makes it a drag and suppresses the menu", () => {
    const g = new RightClickGesture();
    g.begin(100, 100);
    expect(g.isDragging(100 + DRAG_THRESHOLD_PX + 1, 100)).toBe(true);
    expect(g.end(120, 100)).toBe("drag");
  });

  test("a drag stays a drag even if the pointer returns to the start", () => {
    const g = new RightClickGesture();
    g.begin(50, 50);
    g.isDragging(80, 50);
    expect(g.end(50, 50)).toBe("drag");
  });

  test("end without begin is none", () => {
    expect(new RightClickGesture().end(0, 0)).toBe("none");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd /c/dev/colosim/osrs-sdk && npx jest test/sdk/RightClickGesture.test.ts 2>&1 | tail -6`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement the gesture helper**

`src/sdk/utils/RightClickGesture.ts`:
```ts
export const DRAG_THRESHOLD_PX = 4;

export type RightClickResult = "click" | "drag" | "none";

/**
 * Tracks one right-button press so a stationary release opens the context menu
 * while a moving press rotates the camera (RuneLite "right click moves camera").
 */
export class RightClickGesture {
  private startX: number | null = null;
  private startY: number | null = null;
  private dragged = false;

  begin(x: number, y: number) {
    this.startX = x;
    this.startY = y;
    this.dragged = false;
  }

  isDragging(x: number, y: number): boolean {
    if (this.startX === null || this.startY === null) return false;
    if (!this.dragged) {
      const dx = x - this.startX;
      const dy = y - this.startY;
      this.dragged = dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX;
    }
    return this.dragged;
  }

  end(x: number, y: number): RightClickResult {
    if (this.startX === null) return "none";
    const result: RightClickResult = this.isDragging(x, y) ? "drag" : "click";
    this.startX = null;
    this.startY = null;
    this.dragged = false;
    return result;
  }
}
```

- [ ] **Step 4: Run the gesture test, expect PASS**

Run: `cd /c/dev/colosim/osrs-sdk && npx jest test/sdk/RightClickGesture.test.ts 2>&1 | tail -6`

- [ ] **Step 5: Defer the context menu until right-button release**

In `src/sdk/ClickController.ts`:

Add the import and a field:
```ts
import { RightClickGesture } from "./utils/RightClickGesture";
// inside the class, next to other fields:
  private rightGesture = new RightClickGesture();
```
In `clickDown`, replace the `if (e.button === 2) { this.rightClickDown(e); }` block with:
```ts
    if (e.button === 2) {
      this.rightGesture.begin(e.clientX, e.clientY);
      return;
    }
```
Rename `leftClickUp` to `clickUp` (update the `registerClickActions` binding on line ~43 to `this.clickUp.bind(this)`) and make it:
```ts
  clickUp(e: MouseEvent) {
    if (e.button === 2) {
      if (this.rightGesture.end(e.clientX, e.clientY) === "click") {
        this.rightClickDown(e);
      }
      return;
    }
    if (e.button !== 0) {
      return;
    }
    const intercepted = ControlPanelController.controller.controlPanelClickUp(e);
    if (intercepted) {
      return;
    }
  }
```
In `mouseMoved`, add as the first line so the camera can ask whether a right-drag is in progress:
```ts
    if ((e.buttons & 2) === 2) this.rightGesture.isDragging(e.clientX, e.clientY);
```
Expose a getter used by the viewport:
```ts
  get isRightDragging(): boolean {
    return (this.rightGesture as unknown as { dragged: boolean }).dragged;
  }
```
(Cleaner: add `get dragging() { return this.dragged; }` to `RightClickGesture` and return `this.rightGesture.dragging`. Do that instead of the cast.)

- [ ] **Step 6: Rotate on right-drag in the 3D viewport**

In `src/sdk/Viewport3d.ts`, `onDocumentMouseMove`, replace the first line:
```ts
    const middle = (e.buttons & 4) === 4;
    const right = (e.buttons & 2) === 2
      && !Viewport.viewport.contextMenu.isActive
      && Viewport.viewport.clickController.isRightDragging;
    if (!middle && !right) return;
```
Check that `Viewport` is already imported in `Viewport3d.ts` (grep `import { Viewport }`); add it if not, and confirm `clickController` is a public field on `Viewport` (grep `clickController` in `src/sdk/Viewport.ts`; make it `public` if it is private).

- [ ] **Step 7: Run the whole SDK suite**

Run: `cd /c/dev/colosim/osrs-sdk && npx jest 2>&1 | tail -8`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
cd /c/dev/colosim/osrs-sdk && git add src/sdk/utils/RightClickGesture.ts src/sdk/ClickController.ts src/sdk/Viewport3d.ts src/sdk/Viewport.ts test/sdk/RightClickGesture.test.ts && git commit -m "feat: right-drag rotates the camera, stationary right click opens the menu"
```

---

### Task 4: Pat's items in the SDK (stats, cache ids, sprites)

**Files:**
- Modify: `C:\dev\colosim\osrs-sdk\src\assets\CacheAssets.ts` (`items` map)
- Modify: `C:\dev\colosim\osrs-sdk\src\sdk\ItemName.ts`
- Create under `src/content/equipment/`: `BlueMoonHelm.ts`, `BlueMoonChestplate.ts`, `BlueMoonTassets.ts`, `FireCape.ts`, `AmuletOfBloodFury.ts`, `ConflictionGauntlets.ts`, `AvernicTreadsPrEt.ts`, `Lightbearer.ts`, `RadasBlessing4.ts`, `NecklaceOfRupture.ts`, `CrystalHelmIorwerth.ts`, `CrystalBodyIorwerth.ts`, `CrystalLegsIorwerth.ts`
- Create under `src/content/weapons/`: `BloodAncientSceptre.ts`, `SaradominGodsword.ts`, `BurningClaws.ts`, `BowOfFaerdhinenIorwerth.ts`
- Create under `src/content/items/`: `RangingPotion.ts`, `SanfewSerum.ts`, `SaturatedHeart.ts`, `DivineRunePouch.ts`
- Modify: the three `index.ts` files in those folders (add exports)
- Create sprites under `src/assets/images/equipment/` and `src/assets/images/potions/` (downloaded from the wiki)
- Test: `C:\dev\colosim\osrs-sdk\test\content\PatKit.test.ts`

**Interfaces:**
- Produces: `CACHE_ASSETS.items.<camelName>.id` for every id below; each class resolvable through `LoadoutRegistry` by that id.

Ids and bonuses (attack stab/slash/crush/magic/range; defence same order; meleeStrength, rangedStrength, magicDamage, prayer):

| Class | id | attack | defence | other |
|---|---|---|---|---|
| BlueMoonHelm | 29041 | 0/0/0/6/0 | 0/0/10/6/0 | 3/0/1/0 |
| BlueMoonChestplate | 29037 | 0/0/0/30/0 | 0/0/51/28/0 | 2/0/1/0 |
| BlueMoonTassets | 29039 | 0/0/0/22/0 | 0/0/23/32/0 | 1/0/1/0 |
| FireCape | 6570 | 1/1/1/1/1 | 11/11/11/11/11 | 4/0/0/2 |
| AmuletOfBloodFury | 24780 | 10/10/10/10/10 | 15/15/15/15/15 | 8/0/0/5 |
| ConflictionGauntlets | 31106 | 0/0/0/20/-4 | 15/18/7/5/5 | 0/0/7/2 |
| AvernicTreadsPrEt | 31095 | 5/5/5/11/15 | 21/25/25/10/10 | 6/2/2/0 |
| Lightbearer | 25975 | all 0 | all 0 | 0/0/0/0 |
| RadasBlessing4 | 22947 | all 0 | all 0 | 0/0/0/2 |
| NecklaceOfRupture | 33639 | 0/0/0/0/20 | all 0 | 0/8/0/3 |
| BloodAncientSceptre | 28260 | 20/-1/50/20/0 | 2/3/1/15/0 | 60/0/10/-1, speed 4 |
| SaradominGodsword | 11806 | 0/132/80/0/0 | all 0 | 132/0/0/8, speed 6, 2h |
| BurningClaws | 29577 | 43/54/0/0/0 | 3/6/1/0/0 | 32/0/0/0, speed 4, 2h |
| BowOfFaerdhinenIorwerth | 25886 | inherits BowOfFaerdhinen | | |
| CrystalHelmIorwerth | 27729 | inherits CrystalHelm | | |
| CrystalBodyIorwerth | 27721 | inherits CrystalBody | | |
| CrystalLegsIorwerth | 27725 | inherits CrystalLegs | | |
| RangingPotion | 2444 | potion: range += floor(level*0.10)+4, capped at level+that | | |
| SanfewSerum | 10925 | potion: same restore as SuperRestore plus HP unchanged | | |
| SaturatedHeart | 27641 | inert item, defaultAction "Invigorate" (no effect) | | |
| DivineRunePouch | 27509 | inert item, defaultAction "Open" (no effect) | | |

Weights (kg): helm 0.453, chest 3.175, tassets 1.360, fire cape 1.814, blood fury 0.020, confliction 0.226, treads 1.814, lightbearer 0.050, rada 0.453, rupture 0.010, sceptre 2.267, sgs 10.0, claws 0.907, heart 0.450, pouch 0.878.

- [ ] **Step 1: Download inventory sprites from the wiki**

Run (Git Bash):
```bash
cd /c/dev/colosim/osrs-sdk/src/assets/images
UA="Mozilla/5.0 (colosim fork)"
for n in "Blue_moon_helm" "Blue_moon_chestplate" "Blue_moon_tassets" "Fire_cape" "Amulet_of_blood_fury" "Confliction_gauntlets" "Avernic_treads_(pr)(et)" "Lightbearer" "Rada's_blessing_4" "Necklace_of_rupture" "Blood_ancient_sceptre" "Saradomin_godsword" "Burning_claws" "Bow_of_Faerdhinen_(c)_(Iorwerth)" "Crystal_helm_(Iorwerth)" "Crystal_body_(Iorwerth)" "Crystal_legs_(Iorwerth)"; do
  f=$(echo "$n" | sed "s/[()']//g; s/__/_/g").png
  curl -sL -A "$UA" "https://oldschool.runescape.wiki/images/${n}.png" -o "equipment/$f" && echo "$f $(wc -c < equipment/$f)"
done
for n in Ranging_potion_1 Ranging_potion_2 Ranging_potion_3 Ranging_potion_4 Sanfew_serum_1 Sanfew_serum_2 Sanfew_serum_3 Sanfew_serum_4 Saturated_heart Divine_rune_pouch; do
  curl -sL -A "$UA" "https://oldschool.runescape.wiki/images/${n}.png" -o "potions/$n.png" && echo "$n $(wc -c < potions/$n.png)"
done
```
Expected: every file is larger than 300 bytes and `file` reports PNG. Any that come back as HTML (a wiki 404) must be re-fetched by opening `https://oldschool.runescape.wiki/w/File:<name>.png` and using the real file name shown there.

- [ ] **Step 2: Write the failing kit test**

`test/content/PatKit.test.ts`:
```ts
import { LoadoutRegistry } from "../../src/content/LoadoutRegistry";
import { BlueMoonHelm } from "../../src/content/equipment/BlueMoonHelm";
import { BlueMoonChestplate } from "../../src/content/equipment/BlueMoonChestplate";
import { BlueMoonTassets } from "../../src/content/equipment/BlueMoonTassets";
import { FireCape } from "../../src/content/equipment/FireCape";
import { AmuletOfBloodFury } from "../../src/content/equipment/AmuletOfBloodFury";
import { ConflictionGauntlets } from "../../src/content/equipment/ConflictionGauntlets";
import { AvernicTreadsPrEt } from "../../src/content/equipment/AvernicTreadsPrEt";
import { BloodAncientSceptre } from "../../src/content/weapons/BloodAncientSceptre";
import { SaradominGodsword } from "../../src/content/weapons/SaradominGodsword";
import { BurningClaws } from "../../src/content/weapons/BurningClaws";
import { NecklaceOfRupture } from "../../src/content/equipment/NecklaceOfRupture";

const PAT_IDS = [
  29041, 6570, 24780, 28260, 29037, 29039, 31106, 31095, 25975, 22947,
  12006, 7462, 25886, 27721, 12954, 33639, 27729, 27725, 12695, 2444,
  3024, 10925, 6685, 27641, 29796, 11806, 29577, 27509,
];

test("every item in the V3 Colosseum setup resolves in the loadout registry", () => {
  const missing = PAT_IDS.filter((id) => !LoadoutRegistry.has(id));
  expect(missing).toEqual([]);
});

test.each([
  [new BlueMoonHelm(), 29041, { magic: 6 }, { crush: 10, magic: 6 }, { meleeStrength: 3, magicDamage: 1 }],
  [new BlueMoonChestplate(), 29037, { magic: 30 }, { crush: 51, magic: 28 }, { meleeStrength: 2, magicDamage: 1 }],
  [new BlueMoonTassets(), 29039, { magic: 22 }, { crush: 23, magic: 32 }, { meleeStrength: 1, magicDamage: 1 }],
  [new FireCape(), 6570, { slash: 1 }, { slash: 11 }, { meleeStrength: 4, prayer: 2 }],
  [new AmuletOfBloodFury(), 24780, { stab: 10 }, { range: 15 }, { meleeStrength: 8, prayer: 5 }],
  [new ConflictionGauntlets(), 31106, { magic: 20, range: -4 }, { slash: 18 }, { magicDamage: 7, prayer: 2 }],
  [new AvernicTreadsPrEt(), 31095, { range: 15 }, { slash: 25 }, { meleeStrength: 6, rangedStrength: 2, magicDamage: 2 }],
  [new NecklaceOfRupture(), 33639, { range: 20 }, {}, { rangedStrength: 8, prayer: 3 }],
  [new BloodAncientSceptre(), 28260, { crush: 50, magic: 20 }, { magic: 15 }, { meleeStrength: 60, magicDamage: 10, prayer: -1 }],
  [new SaradominGodsword(), 11806, { slash: 132, crush: 80 }, {}, { meleeStrength: 132, prayer: 8 }],
  [new BurningClaws(), 29577, { stab: 43, slash: 54 }, { slash: 6 }, { meleeStrength: 32 }],
])("%s has wiki bonuses", (item, id, attack, defence, other) => {
  expect(item.cacheItemId).toBe(id);
  expect(item.bonuses.attack).toMatchObject(attack);
  expect(item.bonuses.defence).toMatchObject(defence);
  expect(item.bonuses.other).toMatchObject(other);
});

test("two-handers and speeds", () => {
  expect(new SaradominGodsword().isTwoHander).toBe(true);
  expect(new SaradominGodsword().attackSpeed).toBe(6);
  expect(new BurningClaws().isTwoHander).toBe(true);
  expect(new BurningClaws().attackSpeed).toBe(4);
  expect(new BloodAncientSceptre().attackSpeed).toBe(4);
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd /c/dev/colosim/osrs-sdk && npx jest test/content/PatKit.test.ts 2>&1 | tail -6`
Expected: FAIL, cannot find module `BlueMoonHelm`.

- [ ] **Step 4: Register cache ids**

Append inside `CACHE_ASSETS.items` in `src/assets/CacheAssets.ts` (alphabetical placement is nice, not required):
```ts
    amuletOfBloodFury: { id: 24780 },
    avernicTreadsPrEt: { id: 31095 },
    bloodAncientSceptre: { id: 28260 },
    blueMoonChestplate: { id: 29037 },
    blueMoonHelm: { id: 29041 },
    blueMoonTassets: { id: 29039 },
    bowOfFaerdhinenIorwerth: { id: 25886 },
    burningClaws: { id: 29577 },
    conflictionGauntlets: { id: 31106 },
    crystalBodyIorwerth: { id: 27721 },
    crystalHelmIorwerth: { id: 27729 },
    crystalLegsIorwerth: { id: 27725 },
    divineRunePouch: { id: 27509 },
    fireCape: { id: 6570 },
    lightbearer: { id: 25975 },
    necklaceOfRupture: { id: 33639 },
    radasBlessing4: { id: 22947 },
    rangingPotion: { id: 2444 },
    sanfewSerum: { id: 10925 },
    saradominGodsword: { id: 11806 },
    saturatedHeart: { id: 27641 },
```

- [ ] **Step 5: Add item names**

Append to the `ItemName` enum in `src/sdk/ItemName.ts`:
```ts
  BLUE_MOON_HELM = "Blue moon helm",
  BLUE_MOON_CHESTPLATE = "Blue moon chestplate",
  BLUE_MOON_TASSETS = "Blue moon tassets",
  FIRE_CAPE = "Fire cape",
  AMULET_OF_BLOOD_FURY = "Amulet of blood fury",
  CONFLICTION_GAUNTLETS = "Confliction gauntlets",
  AVERNIC_TREADS_PR_ET = "Avernic treads (pr)(et)",
  LIGHTBEARER = "Lightbearer",
  RADAS_BLESSING_4 = "Rada's blessing 4",
  NECKLACE_OF_RUPTURE = "Necklace of rupture",
  BLOOD_ANCIENT_SCEPTRE = "Blood ancient sceptre",
  SARADOMIN_GODSWORD = "Saradomin godsword",
  BURNING_CLAWS = "Burning claws",
  RANGING_POTION = "Ranging potion",
  SANFEW_SERUM = "Sanfew serum",
  SATURATED_HEART = "Saturated heart",
  DIVINE_RUNE_POUCH = "Divine rune pouch",
```

- [ ] **Step 6: Create the armour classes (one file each, same shape)**

Template, shown for `BlueMoonHelm.ts`; repeat for each armour row of the table with its base class (`Helmet`, `Chest`, `Legs`, `Cape`, `Necklace`, `Gloves`, `Feet`, `Ring`, `Ammo`), sprite, name, weight, and bonuses:
```ts
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from "../../assets/images/equipment/Blue_moon_helm.png";
import { Helmet } from "../../sdk/gear/Helmet";
import { ItemName } from "../../sdk/ItemName";
import { CACHE_ASSETS } from "../../assets/CacheAssets";

export class BlueMoonHelm extends Helmet {
  get cacheItemId(): number { return CACHE_ASSETS.items.blueMoonHelm.id; }
  inventorySprite: HTMLImageElement = ImageLoader.createImage(this.inventoryImage);

  get inventoryImage() {
    return InventImage;
  }
  get itemName(): ItemName {
    return ItemName.BLUE_MOON_HELM;
  }
  get weight(): number {
    return 0.453;
  }

  constructor() {
    super();
    this.bonuses = {
      attack: { stab: 0, slash: 0, crush: 0, magic: 6, range: 0 },
      defence: { stab: 0, slash: 0, crush: 10, magic: 6, range: 0 },
      other: { meleeStrength: 3, rangedStrength: 0, magicDamage: 1, prayer: 0 },
      targetSpecific: { undead: 0, slayer: 0 },
    };
  }
}
```
Do not set a `Model` glb: the cache-render bundle supplies the model by `cacheItemId`. Check `AmuletOfRancour.ts` for the necklace base class name and `DizanasQuiver.ts`/`DragonArrows.ts` for the ammo slot base (`Ammo`), and copy their `equipSoundId` override if the base class demands one (TypeScript will tell you).

Iorwerth recolours are subclasses:
```ts
import { CrystalHelm } from "./CrystalHelm";
import { CACHE_ASSETS } from "../../assets/CacheAssets";
import InventImage from "../../assets/images/equipment/Crystal_helm_Iorwerth.png";

export class CrystalHelmIorwerth extends CrystalHelm {
  override get cacheItemId(): number { return CACHE_ASSETS.items.crystalHelmIorwerth.id; }
  override get inventoryImage() { return InventImage; }
}
```
Same for body, legs, and `BowOfFaerdhinenIorwerth extends BowOfFaerdhinen`. If `inventorySprite` is initialised as a class field in the parent from `this.inventoryImage`, the override getter is used because field initialisers run after the prototype chain is set; verify with the kit test's registry check (the sprite is not asserted).

- [ ] **Step 7: Create the weapons**

`BloodAncientSceptre.ts`: copy `AncientStaff.ts` wholesale, rename the class, use `CACHE_ASSETS.items.bloodAncientSceptre`, sprite `Blood_ancient_sceptre.png`, `ItemName.BLOOD_ANCIENT_SCEPTRE`, bonuses from the table, weight 2.267, `attackSpeed` 4, keep `autocastSpell = new BloodBarrageSpell()` and the AUTOCAST default style.

`SaradominGodsword.ts`: copy `NoxiousHalberd.ts`, rename, id `saradominGodsword`, sprite `Saradomin_godsword.png`, bonuses from the table, weight 10, `isTwoHander` true, `attackRange` 1, `attackSpeed` 6, `attackStyleCategory` `AttackStyleTypes.TWOHANDSWORD` if that enum member exists (grep `AttackStyleTypes` in `src/sdk/AttackStylesController.ts`; otherwise `SLASHSWORD`), `defaultStyle` `AttackStyle.AGGRESSIVESLASH`, remove the halberd's `model` and animation overrides so it falls back to the sword slash animation, keep `hasSpecialAttack` true.

`BurningClaws.ts`: copy `DragonClaws.ts` wholesale, rename, id `burningClaws`, sprite `Burning_claws.png`, bonuses from the table, weight 0.907, `isTwoHander` true. Keep the dragon claws special-attack implementation (same four-hit mechanic; the burn effect is out of scope).

- [ ] **Step 8: Create the consumables**

`RangingPotion.ts`: copy `SuperCombatPotion.ts`, rename, id `rangingPotion`, sprites `Ranging_potion_1..4.png`, `ItemName.RANGING_POTION`, and replace the `drink` body with:
```ts
  drink(player: Player) {
    super.drink(player);
    const boost = Math.floor(player.stats.range * 0.1) + 4;
    player.currentStats.range = Math.min(player.currentStats.range + boost, player.stats.range + boost);
  }
```
`SanfewSerum.ts`: copy `SuperRestore.ts`, rename, id `sanfewSerum`, sprites `Sanfew_serum_1..4.png`, `ItemName.SANFEW_SERUM`; keep the restore logic as is.

`SaturatedHeart.ts` and `DivineRunePouch.ts` extend `Item`:
```ts
import { Item } from "../../sdk/Item";
import { ItemName } from "../../sdk/ItemName";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import Image from "../../assets/images/potions/Saturated_heart.png";
import { CACHE_ASSETS } from "../../assets/CacheAssets";

export class SaturatedHeart extends Item {
  inventorySprite: HTMLImageElement = ImageLoader.createImage(Image);
  constructor() {
    super();
    this.defaultAction = "Invigorate";
  }
  get cacheItemId() { return CACHE_ASSETS.items.saturatedHeart.id; }
  get inventoryImage() { return Image; }
  get itemName(): ItemName { return ItemName.SATURATED_HEART; }
  get weight(): number { return 0.45; }
}
```
(Pouch: `defaultAction = "Open"`, weight 0.878, sprite `Divine_rune_pouch.png`.)

- [ ] **Step 9: Export everything from the three index files**

Add one `export { X } from "./X";` line per new class to `src/content/equipment/index.ts`, `src/content/weapons/index.ts`, `src/content/items/index.ts`.

- [ ] **Step 10: Run the kit test, then the whole suite**

Run: `cd /c/dev/colosim/osrs-sdk && npx jest test/content/PatKit.test.ts 2>&1 | tail -30` then `npx jest 2>&1 | tail -6`
Expected: PASS. A `LoadoutRegistry` miss means a class lacks `cacheItemId` or an export.

- [ ] **Step 11: Type-check the SDK build**

Run: `cd /c/dev/colosim/osrs-sdk && npm run build 2>&1 | grep -E "error|ERROR|compiled" | head`
Expected: `compiled successfully`, no `TS` errors.

- [ ] **Step 12: Commit**

```bash
cd /c/dev/colosim/osrs-sdk && git add src/assets/CacheAssets.ts src/sdk/ItemName.ts src/content src/assets/images test/content/PatKit.test.ts && git commit -m "feat: V3 Colosseum kit items with wiki bonuses and cache ids"
```

---

### Task 5: Trainer loadout "V3 Colosseum"

**Files:**
- Modify: `C:\dev\colosim\trainer\src\content\colosseum\js\ColosseumLoadout.ts`
- Modify: `C:\dev\colosim\trainer\src\ColosseumApp.tsx` (`loadoutTemplates`)
- Modify: `C:\dev\colosim\osrs-sdk\src\sdk\Settings.ts` (`createDefaults().loadout`)
- Test: `C:\dev\colosim\trainer\src\content\colosseum\tests\PatLoadout.test.ts`

**Interfaces:**
- Consumes: `CACHE_ASSETS.items.*` from Task 4.
- Produces: exported `v3ColosseumLoadout: Loadout` named `"V3 Colosseum"`, first in `loadoutTemplates`; `Settings` default `loadout` is `"V3 Colosseum"`.

- [ ] **Step 1: Write the failing test**

`src/content/colosseum/tests/PatLoadout.test.ts`:
```ts
import "../../../../test/setupFiles";
import { LoadoutRegistry, Settings } from "osrs-sdk";
import { v3ColosseumLoadout, colosseumLoadout } from "../js/ColosseumLoadout";

test("the V3 loadout mirrors the RuneLite Inventory Setup", () => {
  expect(v3ColosseumLoadout.name).toBe("V3 Colosseum");
  expect(v3ColosseumLoadout.inventory).toHaveLength(28);
  expect(v3ColosseumLoadout.equipment).toEqual({
    weapon: 28260, offhand: null, helmet: 29041, necklace: 24780, cape: 6570,
    ammo: 22947, chest: 29037, legs: 29039, feet: 31095, gloves: 31106, ring: 25975,
  });
  expect(v3ColosseumLoadout.inventory).toEqual([
    12006, 7462, 25886, 27721, 12954, 33639, 27729, 27725,
    12695, 12695, 2444, 2444, 3024, 3024, 3024, 3024,
    3024, 3024, 10925, 6685, 6685, 6685, 6685, 27641,
    29796, 11806, 29577, 27509,
  ]);
});

test("every id in the V3 loadout resolves to an SDK item", () => {
  const ids = [...Object.values(v3ColosseumLoadout.equipment), ...v3ColosseumLoadout.inventory].filter(Boolean);
  expect(ids.filter((id) => !LoadoutRegistry.has(id))).toEqual([]);
});

test("the V3 loadout is the default and upstream's stays available", () => {
  window.localStorage.clear();
  Settings.readFromStorage();
  expect(Settings.loadout).toBe("V3 Colosseum");
  expect(colosseumLoadout.name).toBe("Default");
});
```
Check that `LoadoutRegistry` is exported from `osrs-sdk`'s `index.ts` (grep); export it if not.

- [ ] **Step 2: Run it to verify it fails**

Run: `cd /c/dev/colosim/trainer && npx jest src/content/colosseum/tests/PatLoadout.test.ts 2>&1 | tail -8`

- [ ] **Step 3: Add the loadout**

Append to `ColosseumLoadout.ts`:
```ts
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
```
In `ColosseumApp.tsx`: `const loadoutTemplates = [v3ColosseumLoadout, colosseumLoadout];` (import it). In the SDK `createDefaults()`: `loadout: "V3 Colosseum",`.

- [ ] **Step 4: Rebuild the SDK link, run both suites**

Run: `cd /c/dev/colosim/trainer && npm run link:sdk 2>&1 | tail -3 && npx jest 2>&1 | tail -8 && cd /c/dev/colosim/osrs-sdk && npx jest test/sdk/PatDefaults.test.ts 2>&1 | tail -4`
Expected: PASS everywhere.

- [ ] **Step 5: Commit both repos**

```bash
cd /c/dev/colosim/osrs-sdk && git add src/sdk/Settings.ts src/sdk/index.ts && git commit -m "feat: default loadout is V3 Colosseum"
cd /c/dev/colosim/trainer && git add src/content/colosseum/js/ColosseumLoadout.ts src/ColosseumApp.tsx src/content/colosseum/tests/PatLoadout.test.ts && git commit -m "feat: V3 Colosseum loadout from the RuneLite inventory setup"
```

---

### Task 6: Modern layout: bottom tab bar, bigger panel, chat strip

**Files:**
- Modify: `C:\dev\colosim\osrs-sdk\src\sdk\Settings.ts` (add `modernLayout: boolean` to `SettingsState`, class field, `toState`, `createDefaults` (true), legacy load (`defaults.modernLayout`))
- Modify: `C:\dev\colosim\osrs-sdk\src\sdk\ControlPanelController.ts` (`getTabScale`, `tabPosition`, `controlPosition`, `boostPosition`, `draw`)
- Create: `C:\dev\colosim\osrs-sdk\src\sdk\ChatStrip.ts`
- Modify: `C:\dev\colosim\osrs-sdk\src\sdk\Viewport.ts` (draw the strip after the control panel, line ~217)
- Test: `C:\dev\colosim\osrs-sdk\test\sdk\ModernLayout.test.ts`

**Interfaces:**
- Consumes: `ControlPanelController.selectedControl` toggle from Task 2.
- Produces: `Settings.modernLayout` (default `true`); `ChatStrip.draw(context, width, height)`; layout constants `TAB_W = 33`, `TAB_H = 36`, `PANEL_W = 204`, `PANEL_H = 275`, `MODERN_SCALE_MULT = 1.4`.

Layout rules when `modernLayout` is on and not mobile:
- `getTabScale()` returns `min(Settings.maxUiScale * MODERN_SCALE_MULT, (height - mapHeight) / (PANEL_H + TAB_H) )` so panel plus strip always fit under the minimap.
- Tab i of 14 sits at `x = width - (14 - i) * TAB_W * scale`, `y = height - TAB_H * scale` (one row, right-aligned).
- Panel sits at `x = width - PANEL_W * scale`, `y = height - TAB_H * scale - PANEL_H * scale`.
- Boost panel sits at `x = width - 14 * TAB_W * scale - 60 * scale`, `y = height - TAB_H * scale` (left of the strip).
- Chat strip: seven buttons (All, Game, Public, Private, Channel, Clan, Trade) plus a clock box, each 60 x 24 css px at `scale`, from `x = 8`, `y = height - 28 * scale`. Dark grey (#3a3a3a) boxes, 1px #1a1a1a border, OSRS font, orange text (#ff981f) for "All", white labels with green "On" beneath for the rest, clock shows `new Date().toLocaleTimeString()` in a maroon box (#5c1d1d). Visual only; no click handling.

- [ ] **Step 1: Write the failing layout test**

`test/sdk/ModernLayout.test.ts`:
```ts
jest.unmock("../../src/sdk/ControlPanelController");

import { ControlPanelController, TAB_W, TAB_H, PANEL_W, PANEL_H } from "../../src/sdk/ControlPanelController";
import { Settings } from "../../src/sdk/Settings";
import { Chrome } from "../../src/sdk/Chrome";

describe("modern layout", () => {
  let controller: ControlPanelController;

  beforeAll(() => {
    window.localStorage.clear();
    Settings.readFromStorage();
    jest.spyOn(Chrome, "size").mockReturnValue({ width: 1707, height: 898 });
    controller = new ControlPanelController();
  });

  test("is on by default", () => {
    expect(Settings.modernLayout).toBe(true);
  });

  test("all 14 tabs share one bottom row, right aligned", () => {
    const scale = controller.getTabScale();
    const ys = new Set(controller.controls.map((_, i) => controller.tabPosition(i).y));
    expect(ys.size).toBe(1);
    expect([...ys][0]).toBeCloseTo(898 - TAB_H * scale);
    const last = controller.tabPosition(13);
    expect(last.x + TAB_W * scale).toBeCloseTo(1707);
    expect(controller.tabPosition(0).x).toBeCloseTo(1707 - 14 * TAB_W * scale);
  });

  test("the open panel sits directly above the strip on the right", () => {
    const scale = controller.getTabScale();
    controller.selectedControl = ControlPanelController.controls.INVENTORY;
    const pos = controller.controlPosition(controller.selectedControl);
    expect(pos.x + PANEL_W * scale).toBeCloseTo(1707);
    expect(pos.y + PANEL_H * scale + TAB_H * scale).toBeCloseTo(898);
  });

  test("scale is larger than the compact layout at 1707x898", () => {
    const modern = controller.getTabScale();
    Settings.modernLayout = false;
    const compact = controller.getTabScale();
    Settings.modernLayout = true;
    expect(modern).toBeGreaterThan(compact);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd /c/dev/colosim/osrs-sdk && npx jest test/sdk/ModernLayout.test.ts 2>&1 | tail -10`
Expected: FAIL on the `TAB_W` import or `modernLayout` undefined.

- [ ] **Step 3: Add the setting**

In `Settings.ts`: add `modernLayout: boolean;` to `SettingsState` (alphabetical, after `metronome`), `static modernLayout = true;` on the class, `modernLayout: Settings.modernLayout,` in `toState()`, `modernLayout: true,` in `createDefaults()`, and `modernLayout: defaults.modernLayout,` in `legacyStorage.load`.

- [ ] **Step 4: Implement the layout**

In `ControlPanelController.ts` export the constants at the top:
```ts
export const TAB_W = 33;
export const TAB_H = 36;
export const PANEL_W = 204;
export const PANEL_H = 275;
export const MODERN_SCALE_MULT = 1.4;
```
Replace `getTabScale()`:
```ts
  getTabScale() {
    const { width, height } = Chrome.size();
    const controlAreaHeight = height - MapController.controller.height;
    let scaleRatio: number;
    let maxScaleRatio = Settings.maxUiScale;
    if (Settings.modernLayout && !Settings.mobileCheck()) {
      scaleRatio = controlAreaHeight / (PANEL_H + TAB_H);
      maxScaleRatio = Settings.maxUiScale * MODERN_SCALE_MULT;
    } else {
      scaleRatio = controlAreaHeight / 7 / TAB_H;
      if (Settings.mobileCheck() && width > 600) {
        maxScaleRatio = Settings.maxUiScale * 1.1;
      }
    }
    if (scaleRatio > maxScaleRatio) {
      scaleRatio = maxScaleRatio;
    }
    // not the best place for these setters...
    Settings.controlPanelScale = scaleRatio * 0.915;
    this.width = BASE_WIDTH * scaleRatio;
    this.height = BASE_HEIGHT * scaleRatio;
    return scaleRatio;
  }
```
In `tabPosition(i)`, before the existing desktop `else` branch add:
```ts
    } else if (Settings.modernLayout) {
      return {
        x: width - (this.controls.length - i) * TAB_W * scale,
        y: height - TAB_H * scale,
      };
    } else {
```
In `controlPosition`, before the desktop compact branch:
```ts
    } else if (Settings.modernLayout) {
      return {
        x: width - PANEL_W * scale,
        y: height - TAB_H * scale - PANEL_H * scale,
      };
    } else {
```
In `boostPosition`, before the desktop branch:
```ts
    } else if (Settings.modernLayout) {
      return {
        x: width - this.controls.length * TAB_W * scale - 60 * scale,
        y: height - TAB_H * scale,
      };
    } else {
```
The click hit-tests already use `tabPosition` and `controlPosition`, so they follow. Panel contents scale from `Settings.controlPanelScale`, which `getTabScale` sets.

- [ ] **Step 5: Create the chat strip**

`src/sdk/ChatStrip.ts`:
```ts
import { Settings } from "./Settings";

const LABELS: { label: string; state?: string }[] = [
  { label: "All" },
  { label: "Game", state: "On" },
  { label: "Public", state: "On" },
  { label: "Private", state: "Friends" },
  { label: "Channel", state: "On" },
  { label: "Clan", state: "On" },
  { label: "Trade", state: "On" },
];
const BOX_W = 60;
const BOX_H = 24;

/** Visual-only copy of the RuneLite modern-layout chat buttons along the bottom-left. */
export class ChatStrip {
  static draw(context: CanvasRenderingContext2D, width: number, height: number, scale: number) {
    if (!Settings.modernLayout || Settings.mobileCheck()) return;
    const y = height - (BOX_H + 4) * scale;
    context.save();
    context.font = `${Math.round(12 * scale)}px OSRS`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    LABELS.forEach((entry, i) => {
      const x = (8 + i * (BOX_W + 2)) * scale;
      context.fillStyle = "#3a3a3a";
      context.fillRect(x, y, BOX_W * scale, BOX_H * scale);
      context.strokeStyle = "#1a1a1a";
      context.lineWidth = 1;
      context.strokeRect(x, y, BOX_W * scale, BOX_H * scale);
      context.fillStyle = entry.state ? "#ffffff" : "#ff981f";
      const cx = x + (BOX_W * scale) / 2;
      if (entry.state) {
        context.fillText(entry.label, cx, y + BOX_H * scale * 0.33);
        context.fillStyle = "#00ff00";
        context.fillText(entry.state, cx, y + BOX_H * scale * 0.72);
      } else {
        context.fillText(entry.label, cx, y + (BOX_H * scale) / 2);
      }
    });
    const clockX = (8 + LABELS.length * (BOX_W + 2)) * scale;
    context.fillStyle = "#5c1d1d";
    context.fillRect(clockX, y, BOX_W * 1.5 * scale, BOX_H * scale);
    context.fillStyle = "#ffffff";
    context.fillText(new Date().toLocaleTimeString(), clockX + (BOX_W * 1.5 * scale) / 2, y + (BOX_H * scale) / 2);
    context.restore();
  }
}
```
In `Viewport.ts` after `ControlPanelController.controller.draw(this.context);` add:
```ts
    ChatStrip.draw(this.context, this.width, this.height, ControlPanelController.controller.getTabScale());
```
(Import `ChatStrip`. If `Viewport` has no `width`/`height` fields, use `Chrome.size()`.)

- [ ] **Step 6: Run the layout test and the full suite**

Run: `cd /c/dev/colosim/osrs-sdk && npx jest 2>&1 | tail -8`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd /c/dev/colosim/osrs-sdk && git add src/sdk/Settings.ts src/sdk/ControlPanelController.ts src/sdk/ChatStrip.ts src/sdk/Viewport.ts test/sdk/ModernLayout.test.ts && git commit -m "feat: RuneLite modern layout with bottom tab bar and chat strip"
```

---

### Task 7: Collapsible site sidebar

**Files:**
- Modify: `C:\dev\colosim\trainer\src\ColosseumApp.tsx` (`ColosseumApp` and `Sidebar`)

**Interfaces:**
- Consumes: `Settings.menuVisible`, `Settings.setMenuVisible` (existing).
- Produces: a fixed `⚙` button top-right of the play area that toggles the sidebar; default hidden on desktop for this fork.

- [ ] **Step 1: Add the toggle button**

In `ColosseumApp()` inside `<GameOverlay>` before the disclaimer:
```tsx
        <button
          type="button"
          aria-label="Toggle trainer settings"
          onClick={() => Settings.setMenuVisible(!Settings.menuVisible)}
          style={{ position: "absolute", top: 4, right: 4, width: 36, padding: "4px 0", zIndex: 5, opacity: 0.8 }}
        >
          ⚙
        </button>
```
`GameOverlay` renders inside the play area (check `GameOverlay.tsx`: it portals into the `PlayableArea` div). If it does not, place the button as a sibling of `<DefaultSidebar>` with `position: fixed`.

- [ ] **Step 2: Default the sidebar closed in this fork**

In the SDK `createDefaults()` change `menuVisible: !mobile,` to `menuVisible: false,`. Update `test/sdk/PatDefaults.test.ts` with `expect(Settings.menuVisible).toBe(false);`.

- [ ] **Step 3: Type-check and test**

Run: `cd /c/dev/colosim/trainer && npx tsc --noEmit -p tsconfig.json 2>&1 | head -5 && npx jest 2>&1 | tail -6`

- [ ] **Step 4: Commit both repos**

```bash
cd /c/dev/colosim/osrs-sdk && git add src/sdk/Settings.ts test/sdk/PatDefaults.test.ts && git commit -m "feat: trainer sidebar hidden by default"
cd /c/dev/colosim/trainer && git add src/ColosseumApp.tsx && git commit -m "feat: sidebar toggle button"
```

---

### Task 8: Cache-render bundle, local run, and visual verification

**Files:**
- Generated: `C:\dev\colosim\osrs-sdk\cache-render-bundle\` (git-ignored; confirm with `git check-ignore cache-render-bundle`)
- Modify: `C:\dev\colosim\trainer\README.md` (local run section, fallback list)

- [ ] **Step 1: Extract the bundle from the downloaded cache**

The cache is already at `osrs-sdk/.cache-render/openrs2/2437`. Run:
```bash
cd /c/dev/colosim/osrs-sdk && npm run assets -- 2437 2>&1 | tail -20
ls cache-render-bundle | head; node -e 'const m=require("./cache-render-bundle/manifest.json");console.log(Object.keys(m.playerItems).length, "player items")'
```
Expected: the player item count is 162 + 21 new ids. If `osrscachereader` is missing, clone `https://github.com/Supalosa/osrscachereader.git` branch `feat/reader-only-entrypoint` beside the SDK and `npm ci` in it, then rerun (see `scripts/build-beta.sh` for the exact wiring the Netlify build uses; mirror it).

- [ ] **Step 2: Record any item the extractor could not render**

Run: `node -e 'const m=require("./cache-render-bundle/manifest.json");for(const id of [29041,29037,29039,6570,24780,28260,31106,31095,25975,22947,33639,11806,29577,25886,27721,27729,27725,2444,10925,27641,27509]){const k=Object.keys(m.playerItems).find(k=>m.playerItems[k].itemId===id||k.endsWith(String(id)));console.log(id,k?"ok":"MISSING")}'`
(Adjust the key match to the manifest's actual `playerItems` shape; print one entry first.) Any MISSING id goes into the README "Model fallbacks" list.

- [ ] **Step 3: Start the local stack and load it in the god Chrome**

Run `C:\dev\colosim\start.cmd` via `cmd /c start` from Bash (it opens two consoles). Wait for webpack to report `compiled successfully`, then with `mcp__chrome__browser_navigate` open `http://localhost:8000/` and take a screenshot.

- [ ] **Step 4: Verify each behaviour in the browser**

Using `mcp__chrome__browser_evaluate` and screenshots:
1. Keybinds: dispatch `keydown` F2 on `document`; screenshot shows the inventory; F2 again closes it.
2. Camera: `mcp__chrome__browser_evaluate` dispatches `mousedown` button 2 at canvas centre, three `mousemove` events with `buttons: 2` moving 60 px right, `mouseup`; the yaw changes (expose `Viewport.viewport.getYaw?` or compare two screenshots) and no context menu is visible. A stationary right click shows the menu.
3. Gear: the equipment panel (F5) shows Blue moon set, sceptre, fire cape; the inventory shows the 28 items in order; the 3D player wears blue armour.
4. Layout: bottom tab strip spans the right side in one row; chat strip bottom-left; compare with `C:\Users\thoma\Pictures\Screenshots\Screenshot 2026-09-08 145744.png`.
5. Persistence: change the inventory key to F6 in the sim settings panel, reload, press F6, inventory opens. Click Reset in the sim; F6 still opens the inventory.

- [ ] **Step 5: README and commit**

Add to `trainer/README.md` a "V3 fork" section: how to run `start.cmd`, the loadout source (RuneLite Inventory Setup "Colosseum"), the keybinds, and the "Model fallbacks" list from Step 2 (or "none").
```bash
cd /c/dev/colosim/trainer && git add README.md && git commit -m "docs: V3 fork local run and model fallbacks"
```

---

### Task 9: Netlify deploy

**Files:**
- Modify: `C:\dev\colosim\trainer\netlify.toml` (add `[context.v3]` mirroring `[context.beta]` with the fork repo and branch)

- [ ] **Step 1: Add the branch context**

Append to `netlify.toml`:
```toml
[context.v3]
  command = "bash scripts/build-beta.sh"
  publish = "dist"

[context.v3.environment]
  OSRS_SDK_REPO = "https://github.com/tpgiv1995/osrs-sdk.git"
  OSRS_SDK_BRANCH = "v3"
  OSRS_CACHE_READER_REPO = "https://github.com/Supalosa/osrscachereader.git"
  OSRS_CACHE_READER_BRANCH = "feat/reader-only-entrypoint"
  OSRS_OPENRS2_CACHE_ID = "2437"
  OSRS_ASSET_BASE_URL = "https://assets-soltrainer.netlify.app"
  OSRS_CACHE_RENDER_MANIFEST_URL = "/cache-render/manifest.json"
```

- [ ] **Step 2: Push both branches**

```bash
cd /c/dev/colosim/osrs-sdk && git push -u origin pat
cd /c/dev/colosim/trainer && git add netlify.toml && git commit -m "build: netlify context for the pat branch" && git push -u origin pat
```

- [ ] **Step 3: Create the Netlify site and set its production branch to `pat`**

Run: `cd /c/dev/colosim/trainer && netlify status 2>&1 | head -5` (must show a logged-in account; if not, tell Pat to run `! netlify login`).
```bash
netlify sites:create --name pat-colosim --account-slug "$(netlify api listAccountsForUser | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d)[0].slug))')"
netlify link --name pat-colosim
netlify api updateSite --data '{"site_id":"'"$(node -e 'console.log(require("./.netlify/state.json").siteId)')"'","build_settings":{"repo_branch":"pat"},"repo":{"provider":"github","repo":"tpgiv1995/ColosseumTrainer","branch":"pat","cmd":"bash scripts/build-beta.sh","dir":"dist"}}'
```
If linking the GitHub repo through the API is refused (it usually needs the Netlify GitHub app), fall back to a manual deploy of the local build instead:
```bash
cd /c/dev/colosim/trainer && OSRS_ASSET_BASE_URL=https://assets-soltrainer.netlify.app OSRS_CACHE_RENDER_MANIFEST_URL=/cache-render/manifest.json npm run build && mkdir -p dist/cache-render && cp -r ../osrs-sdk/cache-render-bundle/. dist/cache-render/ && netlify deploy --prod --dir dist
```
Record the resulting URL.

- [ ] **Step 4: Verify the deployed site**

Open the Netlify URL in the god Chrome, screenshot, repeat checks 1, 3, and 4 from Task 8 Step 4.

- [ ] **Step 5: Save a project memory**

Write `C:\Users\thoma\.claude-sarah\projects\C--Users-thoma--runelite\memory\colosim-fork.md` (type `project`): repo paths, branches, Netlify URL, how to run locally, and that the loadout is sourced from the RuneLite Inventory Setup named "Colosseum". Add the index line to `MEMORY.md`.

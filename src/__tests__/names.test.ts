import { pickRandomName, THEME_NAME_POOLS } from "@/lib/game-engine/names";
import { ALL_THEMES } from "@/lib/game-engine/themes";

describe("THEME_NAME_POOLS", () => {
  it("has a non-empty pool for every theme", () => {
    for (const theme of ALL_THEMES) {
      expect(THEME_NAME_POOLS[theme].length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate names within a single theme's pool", () => {
    for (const theme of ALL_THEMES) {
      const pool = THEME_NAME_POOLS[theme];
      expect(new Set(pool).size).toBe(pool.length);
    }
  });
});

describe("pickRandomName", () => {
  it("returns a name from the theme's pool", () => {
    const name = pickRandomName("pirates", new Set());
    expect(THEME_NAME_POOLS.pirates).toContain(name);
  });

  it("never returns a name already in the taken set", () => {
    const pool = THEME_NAME_POOLS.classic_office;
    const taken = new Set(pool.slice(0, pool.length - 1));
    const name = pickRandomName("classic_office", taken);
    expect(name).toBe(pool[pool.length - 1]);
  });

  it("falls back to a numbered placeholder when the entire pool is taken", () => {
    const taken = new Set(THEME_NAME_POOLS.cyberpunk);
    const name = pickRandomName("cyberpunk", taken);
    expect(name).toMatch(/^Character \d+$/);
  });

  it("does not collide with an already-taken numbered placeholder", () => {
    const taken = new Set([...THEME_NAME_POOLS.cyberpunk, "Character 1"]);
    const name = pickRandomName("cyberpunk", taken);
    expect(name).toBe("Character 2");
  });
});

import type { GameTheme } from "@/types/game";

export const THEME_NAME_POOLS: Record<GameTheme, string[]> = {
  classic_office: [
    "Alex", "Priya", "Jordan", "Morgan", "Sam", "Taylor", "Casey", "Riley",
    "Devon", "Jamie", "Avery", "Blair", "Cameron", "Dana", "Elliot", "Frankie",
    "Harper", "Indira", "Jules", "Kendall",
  ],
  farewell_gift: [
    "Nadia", "Oscar", "Petra", "Quinn", "Reese", "Sasha", "Toby", "Uma",
    "Val", "Wren", "Xiomara", "Yusuf", "Zoe", "Bianca", "Caleb", "Dahlia",
    "Ezra", "Fiona", "Gideon", "Hazel",
  ],
  remote_team: [
    "Milo", "Nia", "Otis", "Pia", "Rhys", "Suki", "Theo", "Vera",
    "Wes", "Yara", "Zane", "Abel", "Bex", "Coco", "Dax", "Ember",
    "Finn", "Gia", "Huxley", "Iris",
  ],
  drag_royalty: [
    "Crystal Chaos", "Vanity Voltage", "Bibi Sparkle", "Diamond DeLuxe",
    "Foxxy Flame", "Glitter Galore", "Honey Hurricane", "Ivy Inferno",
    "Jazzy Jubilee", "Kiki Kaleidoscope", "Luna Lush", "Mimi Moonshine",
    "Nova Nightshade", "Opal Obsession", "Peaches Prestige", "Ruby Riot",
    "Sable Sensation", "Tiara Tempest", "Venus Vortex", "Xtra Xtravaganza",
  ],
  medieval_knights: [
    "Sir Cedric", "Sir Roland", "Lady Elowen", "Sir Bertrand", "Lady Isolde",
    "Sir Gareth", "Lady Wren", "Sir Alaric", "Lady Rosalind", "Sir Tristan",
    "Lady Genevieve", "Sir Percival", "Lady Maren", "Sir Oswin", "Lady Briar",
    "Sir Dunstan", "Lady Ottilie", "Sir Fenwick", "Lady Seraphina", "Sir Godric",
  ],
  space_rangers: [
    "Captain Vega", "Ranger Orion", "Commander Nova", "Pilot Cyra",
    "Ranger Kepler", "Commander Zephyr", "Pilot Lyra", "Ranger Titan",
    "Commander Astra", "Pilot Rigel", "Ranger Sirius", "Commander Juno",
    "Pilot Draco", "Ranger Phoenix", "Commander Vesper", "Pilot Atlas",
    "Ranger Nyx", "Commander Halley", "Pilot Io", "Ranger Comet",
  ],
  pirates: [
    "Captain Blackwater", "Redbeard Finn", "One-Eyed Sal", "Scarlett Storm",
    "Bosun Grimes", "Cutlass Kate", "Salty Jack", "Iron Molly",
    "Barnacle Bill", "Anne Ravage", "Peg-Leg Pete", "Mad Maggie",
    "Cannonball Cole", "Silver Sadie", "Roaring Ruth", "Dread Duncan",
    "Plank Percy", "Hazel Hurricane", "Doubloon Doyle", "Tempest Tara",
  ],
  cyberpunk: [
    "Nyx-7", "Glitch", "Vex Karnov", "Riven", "Static Sable", "Neo Kade",
    "Chrome Delilah", "Byte", "Raze Ortega", "Pixel", "Volt Sarin", "Circuit",
    "Nova Ash", "Ghostwire", "Kade Voss", "Zero Cool", "Echo Rain",
    "Synth Vale", "Rook Kade", "Vega Nyx",
  ],
};

export function pickRandomName(theme: GameTheme, taken: Set<string>): string {
  const pool = THEME_NAME_POOLS[theme];
  const available = pool.filter((name) => !taken.has(name));

  if (available.length === 0) {
    let n = 1;
    while (taken.has(`Character ${n}`)) n++;
    return `Character ${n}`;
  }

  return available[Math.floor(Math.random() * available.length)];
}

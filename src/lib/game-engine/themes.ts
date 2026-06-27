import type { GameTheme, CharacterAttributes } from "@/types/game";

// ─── Theme Configuration ────────────────────────────────────────────────────

export type ThemeConfig = {
  label: string;
  description: string;
  allowedOutfits: CharacterAttributes["outfitType"][];
  allowedAccessories: CharacterAttributes["accessory"][];
  promptThemeInstruction: string;
};

export const THEME_CONFIGS: Record<GameTheme, ThemeConfig> = {
  classic_office: {
    label: "Classic Office",
    description: "Everyday workplace characters.",
    allowedOutfits: ["tshirt", "shirt", "hoodie", "jacket", "suit"],
    allowedAccessories: ["none", "coffee_mug", "laptop"],
    promptThemeInstruction:
      "Render this person as an everyday office professional. Use smart-casual or business attire, a clean neutral background, and natural warm lighting. Keep the face clearly visible.",
  },

  farewell_gift: {
    label: "Farewell Gift",
    description: "Office send-off themed set.",
    allowedOutfits: ["tshirt", "shirt", "hoodie", "jacket", "suit"],
    allowedAccessories: ["none", "coffee_mug", "laptop"],
    promptThemeInstruction:
      "Render this person as a beloved departing colleague. Use friendly, warm lighting with a celebratory feel. Keep the face clearly visible.",
  },

  remote_team: {
    label: "Remote Team",
    description: "Work-from-home characters.",
    allowedOutfits: ["tshirt", "hoodie", "jacket"],
    allowedAccessories: ["none", "coffee_mug", "laptop"],
    promptThemeInstruction:
      "Render this person as a remote worker. Show them in a comfortable home-office setting with soft background blur. Keep the face clearly visible.",
  },

  drag_royalty: {
    label: "Drag Royalty",
    description: "Glamorous stage characters.",
    allowedOutfits: ["drag_outfit", "robe"],
    allowedAccessories: ["none", "feather_boa", "microphone"],
    promptThemeInstruction:
      "Render this person as a glamorous drag royalty character. Include dramatic stage makeup, sequins, a crown or feather boa if specified, and confident stage presence. Use vivid theatrical lighting. Keep the face clearly visible.",
  },

  medieval_knights: {
    label: "Medieval Knights",
    description: "Fantasy armoured characters.",
    allowedOutfits: ["armour", "robe"],
    allowedAccessories: ["none", "sword", "shield", "staff"],
    promptThemeInstruction:
      "Render this person as a medieval fantasy knight. Include polished armour, a simple cloak, and a heroic portrait pose. Use warm torchlit fantasy lighting. Keep the face clearly visible.",
  },

  space_rangers: {
    label: "Space Rangers",
    description: "Sci-fi space explorer characters.",
    allowedOutfits: ["spacesuit", "jacket"],
    allowedAccessories: ["none", "jetpack"],
    promptThemeInstruction:
      "Render this person as a space ranger. Use a clean retro-futuristic spacesuit, subtle sci-fi details, and a playful heroic posture. Use cool blue-white studio lighting with a subtle starfield backdrop. Keep the face clearly visible.",
  },

  pirates: {
    label: "Pirates",
    description: "Swashbuckling seafarer characters.",
    allowedOutfits: ["jacket", "robe"],
    allowedAccessories: ["none", "sword"],
    promptThemeInstruction:
      "Render this person as a swashbuckling pirate. Include weathered sea-worn clothing, a dramatic adventurous pose, and warm golden maritime lighting. Keep the face clearly visible.",
  },

  cyberpunk: {
    label: "Cyberpunk",
    description: "Neon-lit futuristic characters.",
    allowedOutfits: ["jacket", "hoodie", "spacesuit"],
    allowedAccessories: ["none", "laptop"],
    promptThemeInstruction:
      "Render this person as a cyberpunk character. Use neon-lit urban aesthetics, dramatic shadows, glowing accents, and a gritty futuristic feel. Keep the face clearly visible.",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getThemeConfig(theme: GameTheme): ThemeConfig {
  return THEME_CONFIGS[theme];
}

export function isOutfitAllowedForTheme(
  outfit: CharacterAttributes["outfitType"],
  theme: GameTheme
): boolean {
  return THEME_CONFIGS[theme].allowedOutfits.includes(outfit);
}

export function isAccessoryAllowedForTheme(
  accessory: CharacterAttributes["accessory"],
  theme: GameTheme
): boolean {
  return THEME_CONFIGS[theme].allowedAccessories.includes(accessory);
}

export const ALL_THEMES = Object.keys(THEME_CONFIGS) as GameTheme[];

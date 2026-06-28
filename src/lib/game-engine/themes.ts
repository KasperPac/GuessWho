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
      "BACKGROUND: Plain warm light grey — no furniture, no environment, nothing behind the character except the background colour. LIGHTING: Soft natural front-fill studio light, minimal shadows. MOOD: Approachable, professional.",
  },

  farewell_gift: {
    label: "Farewell Gift",
    description: "Office send-off themed set.",
    allowedOutfits: ["tshirt", "shirt", "hoodie", "jacket", "suit"],
    allowedAccessories: ["none", "coffee_mug", "laptop"],
    promptThemeInstruction:
      "BACKGROUND: Soft warm cream white — no environment, no props behind the character. LIGHTING: Warm celebratory glow, gentle and flattering. MOOD: Friendly, upbeat, cheerful.",
  },

  remote_team: {
    label: "Remote Team",
    description: "Work-from-home characters.",
    allowedOutfits: ["tshirt", "hoodie", "jacket"],
    allowedAccessories: ["none", "coffee_mug", "laptop"],
    promptThemeInstruction:
      "BACKGROUND: Muted cool blue-grey — flat and clean, no home-office details, no furniture visible. LIGHTING: Soft diffused neutral light. MOOD: Relaxed, approachable, casual.",
  },

  drag_royalty: {
    label: "Drag Royalty",
    description: "Glamorous stage characters.",
    allowedOutfits: ["drag_outfit", "robe"],
    allowedAccessories: ["none", "feather_boa", "microphone"],
    promptThemeInstruction:
      "BACKGROUND: Deep jewel purple — flat, no stage or environment visible. LIGHTING: Vivid theatrical front-fill with subtle warm rim light. MOOD: Glamorous, commanding, confident.",
  },

  medieval_knights: {
    label: "Medieval Knights",
    description: "Fantasy armoured characters.",
    allowedOutfits: ["armour", "robe"],
    allowedAccessories: ["none", "sword", "shield", "staff"],
    promptThemeInstruction:
      "BACKGROUND: Dark charcoal grey with very faint stone texture — no castle, no environment visible. LIGHTING: Warm golden torchlight from slightly above-front. MOOD: Heroic, stoic, determined.",
  },

  space_rangers: {
    label: "Space Rangers",
    description: "Sci-fi space explorer characters.",
    allowedOutfits: ["spacesuit", "jacket"],
    allowedAccessories: ["none", "jetpack"],
    promptThemeInstruction:
      "BACKGROUND: Deep space navy blue with very faint distant stars — no spacecraft, no planet surface, nothing else visible. LIGHTING: Cool blue-white studio light. MOOD: Heroic, adventurous, determined.",
  },

  pirates: {
    label: "Pirates",
    description: "Swashbuckling seafarer characters.",
    allowedOutfits: ["jacket", "robe"],
    allowedAccessories: ["none", "sword"],
    promptThemeInstruction:
      "BACKGROUND: Warm amber-brown — flat, no ocean or ship environment visible. LIGHTING: Warm golden adventurous light. MOOD: Swashbuckling, bold, charismatic.",
  },

  cyberpunk: {
    label: "Cyberpunk",
    description: "Neon-lit futuristic characters.",
    allowedOutfits: ["jacket", "hoodie", "spacesuit"],
    allowedAccessories: ["none", "laptop"],
    promptThemeInstruction:
      "BACKGROUND: Very dark near-black with faint cyan neon glow bleeding in from the edges — no city or environment visible. LIGHTING: Dramatic neon underlighting with deep shadows and a cyan rim light. MOOD: Gritty, futuristic, intense.",
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

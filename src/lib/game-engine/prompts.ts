import type { Character, GameSet } from "@/types/game";
import { getThemeConfig } from "./themes";

// ─── Base Style ──────────────────────────────────────────────────────────────

const BASE_STYLE = `Create a stylised 3D illustrated character portrait for a custom tabletop face-guessing game. \
The character should be front-facing, centered, with a large head, simplified toy-like proportions, clean rounded features, \
soft studio lighting, and a plain warm background. \
The image should be suitable for a printed game card. \
Use a consistent polished 3D illustration style, friendly but not childish, \
with clear readable facial features and accessories.`;

// ─── Attribute Narration ─────────────────────────────────────────────────────

function describeHair(char: Character): string {
  const { hairLength, hairColor, hairTexture } = char.attributes;

  if (hairLength === "bald") return "- completely bald";

  const lengthMap: Record<string, string> = {
    buzz: "buzz-cut",
    short: "short",
    medium: "medium-length",
    long: "long",
  };

  const colorMap: Record<string, string> = {
    black: "black",
    brown: "brown",
    blonde: "blonde",
    red: "red",
    grey: "grey",
    white: "white",
    dyed: "brightly dyed",
    hidden: "hidden under hat or covering",
  };

  const textureMap: Record<string, string> = {
    straight: "straight",
    wavy: "wavy",
    curly: "curly",
    afro: "natural afro",
    none: "",
    hidden: "",
  };

  const length = lengthMap[hairLength] ?? hairLength;
  const color = colorMap[hairColor] ?? hairColor;
  const texture = textureMap[hairTexture] ?? hairTexture;

  const parts = [length, color, texture].filter(Boolean);
  return `- ${parts.join(" ")} hair`;
}

function describeFacialHair(char: Character): string {
  const { facialHair } = char.attributes;
  const map: Record<string, string> = {
    none: "- clean shaven, no facial hair",
    stubble: "- short stubble",
    moustache: "- moustache",
    goatee: "- goatee",
    beard: "- full beard",
  };
  return map[facialHair] ?? `- ${facialHair}`;
}

function describeGlasses(char: Character): string {
  const { glasses } = char.attributes;
  const map: Record<string, string> = {
    none: "- no glasses",
    round: "- round glasses",
    square: "- square glasses",
    sunglasses: "- sunglasses",
  };
  return map[glasses] ?? `- ${glasses}`;
}

function describeHat(char: Character): string {
  const { hat } = char.attributes;
  const map: Record<string, string> = {
    none: "- no hat",
    cap: "- baseball cap",
    beanie: "- beanie hat",
    helmet: "- helmet",
    crown: "- crown",
    cowboy_hat: "- cowboy hat",
    wizard_hat: "- wizard hat",
  };
  return map[hat] ?? `- ${hat}`;
}

function describeEyes(char: Character): string {
  const { eyeColor } = char.attributes;
  if (eyeColor === "not_visible") return "- eyes not visible";
  return `- ${eyeColor} eyes`;
}

function describeExpression(char: Character): string {
  const { expression } = char.attributes;
  const map: Record<string, string> = {
    smiling_teeth: "- wide open smile showing teeth",
    smiling_closed: "- closed-mouth smile",
    neutral: "- neutral relaxed expression",
    serious: "- serious stern expression",
  };
  return map[expression] ?? `- ${expression}`;
}

function describeOutfit(char: Character): string {
  const { topColor, outfitType } = char.attributes;

  const colorMap: Record<string, string> = {
    red: "red",
    blue: "blue",
    green: "green",
    yellow: "yellow",
    black: "black",
    white: "white",
    purple: "purple",
    orange: "orange",
  };

  const outfitMap: Record<string, string> = {
    tshirt: "t-shirt",
    shirt: "collared shirt",
    hoodie: "hoodie",
    jacket: "jacket",
    suit: "suit",
    armour: "armour",
    spacesuit: "spacesuit",
    robe: "robe",
    drag_outfit: "sequinned drag outfit",
  };

  const color = colorMap[topColor] ?? topColor;
  const outfit = outfitMap[outfitType] ?? outfitType;
  return `- wearing a ${color} ${outfit}`;
}

function describeAccessory(char: Character): string {
  const { accessory } = char.attributes;
  const map: Record<string, string> = {
    none: "- no accessory",
    coffee_mug: "- holding a coffee mug",
    laptop: "- holding a laptop",
    sword: "- holding a sword",
    shield: "- holding a shield",
    staff: "- holding a magical staff",
    jetpack: "- wearing a jetpack",
    feather_boa: "- wearing a feather boa",
    microphone: "- holding a microphone",
  };
  return map[accessory] ?? `- ${accessory}`;
}

// ─── Prompt Assembly ─────────────────────────────────────────────────────────

export function generateCharacterPrompt(
  character: Character,
  gameSet: GameSet
): string {
  const themeConfig = getThemeConfig(gameSet.theme);

  const characterDetails = [
    describeHair(character),
    describeFacialHair(character),
    describeGlasses(character),
    describeHat(character),
    describeEyes(character),
    describeExpression(character),
    describeOutfit(character),
    describeAccessory(character),
  ].join("\n");

  const themeTraits: string[] = [];
  if (character.attributes.themeTrait1) {
    themeTraits.push(`- ${character.attributes.themeTrait1}`);
  }
  if (character.attributes.themeTrait2) {
    themeTraits.push(`- ${character.attributes.themeTrait2}`);
  }
  const themeTraitBlock =
    themeTraits.length > 0 ? `\nAdditional details:\n${themeTraits.join("\n")}` : "";

  return [
    BASE_STYLE,
    "",
    `Theme:\n${themeConfig.promptThemeInstruction}`,
    "",
    `Character name: ${character.displayName}`,
    "",
    `Character details:\n${characterDetails}${themeTraitBlock}`,
  ].join("\n");
}

// ─── Batch Generation ────────────────────────────────────────────────────────

export function generateAllPrompts(
  characters: Character[],
  gameSet: GameSet
): Map<string, string> {
  const prompts = new Map<string, string>();
  for (const character of characters) {
    prompts.set(character.id, generateCharacterPrompt(character, gameSet));
  }
  return prompts;
}

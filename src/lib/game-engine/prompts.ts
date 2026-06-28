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

// ─── Image Generation Prompt ─────────────────────────────────────────────────
// Separate from generateCharacterPrompt (which is used for balance scoring).
// Physical appearance comes from the reference photo; only costume/props are specified.

export function generateImagePrompt(
  character: Character,
  gameSet: GameSet
): string {
  const themeConfig = getThemeConfig(gameSet.theme);
  const { attributes, displayName } = character;

  // Outfit
  const colorMap: Record<string, string> = {
    red: "red", blue: "blue", green: "green", yellow: "yellow",
    black: "black", white: "white", purple: "purple", orange: "orange",
  };
  const outfitMap: Record<string, string> = {
    tshirt: "t-shirt", shirt: "collared shirt", hoodie: "hoodie",
    jacket: "jacket", suit: "suit", armour: "suit of armour",
    spacesuit: "spacesuit", robe: "robe", drag_outfit: "sequinned drag outfit",
  };
  const outfit = `${colorMap[attributes.topColor] ?? attributes.topColor} ${outfitMap[attributes.outfitType] ?? attributes.outfitType}`;

  // Accessories (only if present)
  const accessoryMap: Record<string, string> = {
    none: "", coffee_mug: "holding a coffee mug", laptop: "holding a laptop",
    sword: "holding a sword", shield: "holding a shield",
    staff: "holding a magical staff", jetpack: "wearing a jetpack",
    feather_boa: "wearing a feather boa", microphone: "holding a microphone",
  };
  const hatMap: Record<string, string> = {
    none: "", cap: "wearing a baseball cap", beanie: "wearing a beanie",
    helmet: "wearing a helmet", crown: "wearing a crown",
    cowboy_hat: "wearing a cowboy hat", wizard_hat: "wearing a wizard hat",
  };
  const glasseMap: Record<string, string> = {
    none: "", round: "wearing round glasses", square: "wearing square glasses",
    sunglasses: "wearing sunglasses",
  };

  const heldAccessories = ["coffee_mug", "laptop", "sword", "shield", "staff", "microphone"];
  const hasHeldItem = heldAccessories.includes(attributes.accessory);

  const props = [
    hatMap[attributes.hat],
    glasseMap[attributes.glasses],
    accessoryMap[attributes.accessory],
  ].filter(Boolean);

  const propBlock = props.length > 0
    ? `\nCostume additions (apply these on top of the person's real appearance):\n${props.map(p => `- ${p}`).join("\n")}`
    : "";

  const framing = hasHeldItem
    ? `FRAMING: Front-facing portrait showing the person from the waist up so that the item they are holding is clearly visible. Centred, suitable for a printed game card.`
    : `FRAMING: Front-facing portrait, head and shoulders visible, centred, suitable for a printed game card.`;

  return [
    `VISUAL REFERENCE: Use the attached photo as the appearance reference for this character. Match the hair colour, hair length and style, skin tone, eye colour, and general face shape shown in the photo. Apply these features to the illustrated character portrait.`,
    ``,
    `CHARACTER NAME: ${displayName}`,
    ``,
    `OUTFIT: The person is wearing a ${outfit}.`,
    propBlock,
    ``,
    `SCENE / THEME: ${themeConfig.promptThemeInstruction}`,
    ``,
    framing,
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

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
// Pass includePhysicalOverrides=true to add attribute-driven appearance overrides.

export function generateImagePrompt(
  character: Character,
  gameSet: GameSet,
  includePhysicalOverrides = false
): string {
  const themeConfig = getThemeConfig(gameSet.theme);
  const { attributes, displayName } = character;
  const hasReferencePhoto = character.referenceImageUrls.length > 0;
  const applyPhysicalOverrides = includePhysicalOverrides || !hasReferencePhoto;

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

  // Required accessories — built as emphatic MUST-APPEAR items
  const heldAccessoryLabels: Record<string, string> = {
    coffee_mug: "holding a coffee mug",
    laptop: "holding a laptop",
    sword: "holding a sword",
    shield: "holding a shield",
    staff: "holding a magical staff",
    microphone: "holding a microphone",
  };
  const glassesLabels: Record<string, string> = {
    round: "round glasses",
    square: "square glasses",
    sunglasses: "sunglasses",
  };
  const hatLabels: Record<string, string> = {
    cap: "baseball cap",
    beanie: "beanie hat",
    helmet: "helmet",
    crown: "crown",
    cowboy_hat: "cowboy hat",
    wizard_hat: "wizard hat",
  };

  const heldItem = heldAccessoryLabels[attributes.accessory] ?? null;
  const glasses = glassesLabels[attributes.glasses] ?? null;
  const hat = hatLabels[attributes.hat] ?? null;
  const wornAccessory =
    attributes.accessory === "feather_boa" ? "feather boa"
    : attributes.accessory === "jetpack" ? "jetpack"
    : null;

  const requiredItems: string[] = [];
  if (glasses) requiredItems.push(`GLASSES: The character is wearing ${glasses}. These MUST be clearly visible on their face.`);
  if (hat) requiredItems.push(`HAT: The character is wearing a ${hat}. This MUST be clearly visible on their head.`);
  if (heldItem) requiredItems.push(`HELD ITEM: The character is ${heldItem}. This MUST be clearly visible — use waist-up framing so the hands and item are in the image.`);
  if (wornAccessory) requiredItems.push(`ACCESSORY: The character is wearing a ${wornAccessory}. This MUST be clearly visible.`);

  const accessoriesBlock = requiredItems.length > 0
    ? `\nREQUIRED ACCESSORIES — ALL OF THESE MUST APPEAR IN THE IMAGE. DO NOT OMIT ANY:\n${requiredItems.map(item => `- ${item}`).join("\n")}`
    : "";

  const framing = heldItem
    ? `FRAMING: Show the character from the waist up. Both hands and the held item MUST be visible in the lower part of the image. Do not crop the hands or the item.`
    : `FRAMING: Front-facing portrait, head and shoulders visible, centred, suitable for a printed game card.`;

  // Physical overrides — only included when user opts in
  let physicalBlock = "";
  if (applyPhysicalOverrides) {
    const lengthMap: Record<string, string> = { buzz: "buzz-cut", short: "short", medium: "medium-length", long: "long" };
    const hairColorMap: Record<string, string> = {
      black: "black", brown: "brown", blonde: "blonde", red: "red",
      grey: "grey", white: "white", dyed: "brightly dyed", hidden: "hidden under hat",
    };
    const textureMap: Record<string, string> = { straight: "straight", wavy: "wavy", curly: "curly", afro: "natural afro", none: "", hidden: "" };
    const expressionMap: Record<string, string> = {
      smiling_teeth: "wide open smile showing teeth",
      smiling_closed: "closed-mouth smile",
      neutral: "neutral relaxed expression",
      serious: "serious stern expression",
    };
    const facialHairMap: Record<string, string> = {
      none: "", stubble: "short stubble", moustache: "moustache", goatee: "goatee", beard: "full beard",
    };

    const overrides: string[] = [];
    if (attributes.hairLength === "bald") {
      overrides.push("- Hair: completely bald");
    } else {
      const parts = [lengthMap[attributes.hairLength], hairColorMap[attributes.hairColor], textureMap[attributes.hairTexture]].filter(Boolean);
      if (parts.length) overrides.push(`- Hair: ${parts.join(" ")} hair`);
    }
    if (attributes.eyeColor !== "not_visible") overrides.push(`- Eyes: ${attributes.eyeColor} eyes`);
    if (facialHairMap[attributes.facialHair]) overrides.push(`- Facial hair: ${facialHairMap[attributes.facialHair]}`);
    overrides.push(`- Expression: ${expressionMap[attributes.expression] ?? attributes.expression}`);

    if (overrides.length) {
      physicalBlock = `\nAPPEARANCE OVERRIDES (apply these on top of the reference photo):\n${overrides.join("\n")}`;
    }
  }

  const compositionBlock = heldItem
    ? `COMPOSITION — follow exactly:
- Square canvas. Show character from waist up — hands and held item must be in the lower portion.
- Character faces the camera directly forward. Head perfectly centred left-right.
- No three-quarter angle, no tilt, no profile view.
- Camera at eye level.`
    : `COMPOSITION — follow exactly:
- Square canvas. Show head and upper chest only — crop at mid-chest level.
- Character faces the camera directly forward. Head perfectly centred left-right.
- Face fills approximately 60% of the frame height. Top of head 5–10% from the top edge.
- No three-quarter angle, no tilt, no profile view. No extreme close-up. No wide shot.
- Camera at eye level — no upward or downward angle.`;

  const visualReferenceLine = hasReferencePhoto
    ? `VISUAL REFERENCE: Use the attached photo as the appearance reference. Match the hair colour, hair style, skin tone, eye colour, and general face shape shown in the photo.`
    : `VISUAL REFERENCE: No reference photo is provided — invent the character's full appearance strictly from the details below.`;

  return [
    compositionBlock,
    ``,
    `THEME: ${themeConfig.promptThemeInstruction}`,
    ``,
    visualReferenceLine,
    physicalBlock,
    ``,
    `CHARACTER NAME: ${displayName}`,
    ``,
    `OUTFIT: The character is wearing a ${outfit}.`,
    accessoriesBlock,
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

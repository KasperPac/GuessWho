// ─── Themes ────────────────────────────────────────────────────────────────

export type GameTheme =
  | "classic_office"
  | "farewell_gift"
  | "remote_team"
  | "drag_royalty"
  | "medieval_knights"
  | "space_rangers"
  | "pirates"
  | "cyberpunk";

// ─── Image Styles ──────────────────────────────────────────────────────────

export type ImageStyle =
  | "cartoon"
  | "realistic"
  | "simpsons"
  | "pixar"
  | "watercolour"
  | "anime"
  | "lego"
  | "southpark";

// ─── Attributes ────────────────────────────────────────────────────────────

export type CharacterAttributes = {
  hairLength: "bald" | "buzz" | "short" | "medium" | "long";
  hairColor:
    | "black"
    | "brown"
    | "blonde"
    | "red"
    | "grey"
    | "white"
    | "dyed"
    | "hidden";
  hairTexture: "straight" | "wavy" | "curly" | "afro" | "none" | "hidden";

  facialHair: "none" | "stubble" | "moustache" | "goatee" | "beard";
  glasses: "none" | "round" | "square" | "sunglasses";
  hat:
    | "none"
    | "cap"
    | "beanie"
    | "helmet"
    | "crown"
    | "cowboy_hat"
    | "wizard_hat";

  eyeColor: "brown" | "blue" | "green" | "hazel" | "grey" | "not_visible";
  expression:
    | "smiling_teeth"
    | "smiling_closed"
    | "neutral"
    | "serious";

  topColor:
    | "red"
    | "blue"
    | "green"
    | "yellow"
    | "black"
    | "white"
    | "purple"
    | "orange";
  outfitType:
    | "tshirt"
    | "shirt"
    | "hoodie"
    | "jacket"
    | "suit"
    | "armour"
    | "spacesuit"
    | "robe"
    | "drag_outfit";
  accessory:
    | "none"
    | "coffee_mug"
    | "laptop"
    | "sword"
    | "shield"
    | "staff"
    | "jetpack"
    | "feather_boa"
    | "microphone";

  themeTrait1?: string;
  themeTrait2?: string;
};

// ─── Entities ──────────────────────────────────────────────────────────────

export type GameSetStatus =
  | "draft"
  | "ready_for_generation"
  | "generating"
  | "ready_for_review"
  | "approved"
  | "exported";

export type GameSet = {
  id: string;
  title: string;
  theme: GameTheme;
  imageStyle: ImageStyle;
  status: GameSetStatus;
  characterCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Character = {
  id: string;
  gameSetId: string;
  displayName: string;
  referenceImageUrls: string[];
  generatedImageUrl?: string;
  personId?: string;
  attributes: CharacterAttributes;
  prompt?: string;
  balanceWarnings?: string[];
  createdAt: string;
  updatedAt: string;
};

export type Person = {
  id: string;
  displayName: string;
  referenceImageUrls: string[];
  createdAt: string;
  updatedAt: string;
};

// ─── Balance ───────────────────────────────────────────────────────────────

export type WarningSeverity = "info" | "warning" | "critical";

export type DeckWarning = {
  severity: WarningSeverity;
  message: string;
  affectedCharacterIds?: string[];
  affectedTrait?: string;
};

export type TraitUsefulness = "poor" | "okay" | "good";

export type TraitDistribution = {
  trait: string;
  value: string;
  count: number;
  percentage: number;
  usefulness: TraitUsefulness;
};

export type SimilarCharacterPair = {
  characterAId: string;
  characterBId: string;
  similarityScore: number;
  sharedTraits: string[];
  differingTraits: string[];
};

export type SuggestedFix = {
  characterId: string;
  trait: keyof CharacterAttributes;
  currentValue: string;
  suggestedValue: string;
  reason: string;
};

export type DeckBalanceReport = {
  isPlayable: boolean;
  score: number;
  warnings: DeckWarning[];
  traitDistribution: TraitDistribution[];
  similarPairs: SimilarCharacterPair[];
  suggestedFixes: SuggestedFix[];
};

// ─── Image Generation ──────────────────────────────────────────────────────

export type GeneratedImageResult = {
  imageData: string;  // base64-encoded image bytes (no data URI prefix)
  mimeType: string;   // e.g. "image/jpeg"
  provider: string;
  prompt: string;
};

export interface ImageGenerationProvider {
  generateImage(
    prompt: string,
    referenceImageUrls: string[]
  ): Promise<GeneratedImageResult>;
}

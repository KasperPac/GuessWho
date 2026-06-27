import type { ImageStyle } from "@/types/game";

export type ImageStyleConfig = {
  label: string;
  description: string;
  promptModifier: string;
};

export const IMAGE_STYLE_CONFIGS: Record<ImageStyle, ImageStyleConfig> = {
  cartoon: {
    label: "Cartoon",
    description: "Bold outlines, flat colours, exaggerated features.",
    promptModifier:
      "Render in a bold cartoon illustration style with clean outlines, flat vibrant colours, and exaggerated friendly features.",
  },
  realistic: {
    label: "Realistic",
    description: "Photo-like digital portrait.",
    promptModifier:
      "Render as a photorealistic digital portrait with accurate facial likeness, professional studio lighting, and sharp detail.",
  },
  simpsons: {
    label: "Simpsons",
    description: "Yellow skin, overbite, Springfield style.",
    promptModifier:
      "Render in The Simpsons animation style: yellow skin tone, overbite, simple oval eyes, flat colour fills, Springfield aesthetic.",
  },
  pixar: {
    label: "Pixar 3D",
    description: "Warm 3D render, large eyes, friendly proportions.",
    promptModifier:
      "Render in Pixar 3D animation style: warm polished render, large expressive eyes, soft studio lighting, friendly rounded proportions.",
  },
  watercolour: {
    label: "Watercolour",
    description: "Painterly washes, soft edges.",
    promptModifier:
      "Render as a watercolour portrait painting with soft colour washes, painterly brushwork, and slightly loose edges.",
  },
  anime: {
    label: "Anime",
    description: "Large eyes, clean lines, vibrant colours.",
    promptModifier:
      "Render in Japanese anime style: large expressive eyes, clean bold outlines, vibrant colours, high-contrast shading.",
  },
  lego: {
    label: "LEGO Minifigure",
    description: "Blocky yellow figure with printed face.",
    promptModifier:
      "Render as a LEGO minifigure: blocky yellow plastic body, printed facial features, classic LEGO proportions, studio product lighting.",
  },
  southpark: {
    label: "South Park",
    description: "Flat cutout, simple round head.",
    promptModifier:
      "Render in South Park animation style: flat 2D cutout aesthetic, simple round head, construction paper texture, limited colour palette.",
  },
};

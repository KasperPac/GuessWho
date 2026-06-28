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
      "Render in a classic American TV cartoon style: bright yellow skin tone, prominent overbite, simple oval eyes, thick black outlines, flat solid colour fills, cheerful suburban aesthetic.",
  },
  pixar: {
    label: "Pixar 3D",
    description: "Warm 3D render, large eyes, friendly proportions.",
    promptModifier:
      "Render in a polished 3D animated film style: warm studio lighting, large expressive eyes, soft rounded features, friendly proportions, high-quality subsurface skin shading.",
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
      "Render as a plastic toy minifigure: blocky cylindrical yellow body, simplified printed facial features, signature stubby proportions, studio product photography lighting on a white background.",
  },
  southpark: {
    label: "South Park",
    description: "Flat cutout, simple round head.",
    promptModifier:
      "Render in a flat 2D paper cutout cartoon style: simple circular head, minimal facial features, construction paper texture, limited flat colour palette, crude but charming aesthetic.",
  },
};

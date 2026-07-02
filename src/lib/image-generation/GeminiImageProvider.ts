import { GoogleGenAI } from "@google/genai";
import type { ImageGenerationProvider, GeneratedImageResult } from "@/types/game";

export class GeminiImageProvider implements ImageGenerationProvider {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateImage(
    prompt: string,
    referenceImageUrls: string[]
  ): Promise<GeneratedImageResult> {
    // Fetch each reference image and convert to base64 inline data.
    // An empty array is valid — Gemini generates from the text prompt alone.
    const imageParts = await Promise.all(
      referenceImageUrls.map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch reference image: ${url} (HTTP ${res.status})`);
        }
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = res.headers.get("content-type") ?? "image/jpeg";
        return { type: "image" as const, data: base64, mime_type: mimeType };
      })
    );

    const interaction = await this.ai.interactions.create({
      model: "gemini-3-pro-image",
      input: [
        { type: "text" as const, text: prompt },
        ...imageParts,
      ],
      response_modalities: ["image"],
    });

    const outputImage = interaction.output_image;
    if (!outputImage?.data) {
      throw new Error("Gemini returned no image in response");
    }

    return {
      imageData: outputImage.data,
      mimeType: outputImage.mime_type ?? "image/jpeg",
      provider: "gemini",
      prompt,
    };
  }
}

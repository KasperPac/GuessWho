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
    if (referenceImageUrls.length === 0) {
      throw new Error("At least one reference image URL is required");
    }
    // Fetch each reference image and convert to base64 inline data
    const imageParts = await Promise.all(
      referenceImageUrls.map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch reference image: ${url} (HTTP ${res.status})`);
        }
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = res.headers.get("content-type") ?? "image/jpeg";
        return {
          inlineData: { data: base64, mimeType },
        };
      })
    );

    const contents = [
      {
        role: "user",
        parts: [
          { text: prompt },
          ...imageParts,
        ],
      },
    ];

    const response = await this.ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents,
      config: {
        responseModalities: ["IMAGE"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart?.inlineData?.data) {
      throw new Error("Gemini returned no image in response");
    }

    return {
      imageData: imagePart.inlineData.data ?? "",
      mimeType: imagePart.inlineData.mimeType ?? "image/jpeg",
      provider: "gemini",
      prompt,
    };
  }
}

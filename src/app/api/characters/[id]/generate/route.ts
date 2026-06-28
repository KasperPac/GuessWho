import { NextRequest, NextResponse } from "next/server";
import { getCharacter, getGameSet, updateCharacter } from "@/lib/supabase/db";
import { supabase } from "@/lib/supabase/client";
import { generateImagePrompt } from "@/lib/game-engine/prompts";
import { IMAGE_STYLE_CONFIGS } from "@/lib/image-generation/styles";
import { GeminiImageProvider } from "@/lib/image-generation/GeminiImageProvider";
import type { ImageStyle, CharacterAttributes } from "@/types/game";

function getProvider(): GeminiImageProvider {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY environment variable is not set");
  }
  return new GeminiImageProvider(apiKey);
}

async function callGemini(prompt: string, referenceImageUrls: string[]) {
  return getProvider().generateImage(prompt, referenceImageUrls);
}

async function callGeminiWithRetry(prompt: string, referenceImageUrls: string[]) {
  try {
    return await callGemini(prompt, referenceImageUrls);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Retry once on 429 rate limit
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return await callGemini(prompt, referenceImageUrls);
    }
    throw err;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: charId } = await params;

  let body: {
    gameSetId: string;
    imageStyle: ImageStyle;
    currentAttributes?: CharacterAttributes;
    currentDisplayName?: string;
    includePhysicalOverrides?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { gameSetId, imageStyle } = body;

  const VALID_IMAGE_STYLES = Object.keys(IMAGE_STYLE_CONFIGS) as ImageStyle[];

  if (!gameSetId || typeof gameSetId !== "string") {
    return NextResponse.json({ error: "Missing or invalid gameSetId" }, { status: 400 });
  }
  if (!imageStyle || !VALID_IMAGE_STYLES.includes(imageStyle)) {
    return NextResponse.json({ error: "Missing or invalid imageStyle" }, { status: 400 });
  }

  // 1. Fetch character
  const character = await getCharacter(charId);
  if (!character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  // 2. Validate reference images
  if (character.referenceImageUrls.length === 0) {
    return NextResponse.json(
      { error: "Upload at least one reference photo first" },
      { status: 400 }
    );
  }

  // 3. Fetch game set
  const gameSet = await getGameSet(gameSetId);
  if (!gameSet) {
    return NextResponse.json({ error: "Game set not found" }, { status: 404 });
  }

  // 4. Build prompt: use current attrs from client (avoids stale DB data),
  //    then apply photo-first prompt + optional physical overrides + style modifier
  const effectiveCharacter = {
    ...character,
    ...(body.currentDisplayName ? { displayName: body.currentDisplayName } : {}),
    ...(body.currentAttributes ? { attributes: body.currentAttributes } : {}),
  };
  const basePrompt = generateImagePrompt(effectiveCharacter, gameSet, body.includePhysicalOverrides ?? false);
  const styleModifier = IMAGE_STYLE_CONFIGS[imageStyle].promptModifier;
  const fullPrompt = `${basePrompt}\n\nARTISTIC STYLE: ${styleModifier}`;

  // 5. Call Gemini
  let result;
  try {
    result = await callGeminiWithRetry(fullPrompt, character.referenceImageUrls);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown Gemini error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // 6. Upload generated image to Supabase Storage
  const storagePath = `${gameSetId}/${charId}/generated.jpg`;
  const imageBuffer = Buffer.from(result.imageData, "base64");

  const { error: uploadError } = await supabase.storage
    .from("character-images")
    .upload(storagePath, imageBuffer, {
      contentType: result.mimeType,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // 7. Get public URL
  const { data: urlData } = supabase.storage
    .from("character-images")
    .getPublicUrl(storagePath);

  const generatedImageUrl = urlData.publicUrl;

  // 8. Update character in DB
  try {
    await updateCharacter(charId, { generatedImageUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "DB update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // 9. Return URL + prompt (so client can display what was actually sent)
  return NextResponse.json({ generatedImageUrl, prompt: fullPrompt });
}

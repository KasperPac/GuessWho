import { supabase } from "./client";
import type {
  GameSet,
  Character,
  CharacterAttributes,
  DeckBalanceReport,
} from "@/types/game";

// ─── Type helpers ─────────────────────────────────────────────────────────────
// Supabase returns snake_case rows; these map to camelCase domain types.

function rowToGameSet(row: Record<string, unknown>): GameSet {
  return {
    id: row.id as string,
    title: row.title as string,
    theme: row.theme as GameSet["theme"],
    status: row.status as GameSet["status"],
    characterCount: row.character_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToCharacter(row: Record<string, unknown>): Character {
  return {
    id: row.id as string,
    gameSetId: row.game_set_id as string,
    displayName: row.display_name as string,
    referenceImageUrl: row.reference_image_url as string | undefined,
    generatedImageUrl: row.generated_image_url as string | undefined,
    attributes: row.attributes as CharacterAttributes,
    prompt: row.prompt as string | undefined,
    balanceWarnings: row.balance_warnings as string[] | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── GameSet CRUD ─────────────────────────────────────────────────────────────

export async function listGameSets(): Promise<GameSet[]> {
  const { data, error } = await supabase
    .from("game_sets")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToGameSet);
}

export async function getGameSet(id: string): Promise<GameSet | null> {
  const { data, error } = await supabase
    .from("game_sets")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }
  return rowToGameSet(data);
}

export async function createGameSet(
  input: Pick<GameSet, "title" | "theme">
): Promise<GameSet> {
  const { data, error } = await supabase
    .from("game_sets")
    .insert({ title: input.title, theme: input.theme })
    .select()
    .single();

  if (error) throw error;
  return rowToGameSet(data);
}

export async function updateGameSet(
  id: string,
  input: Partial<Pick<GameSet, "title" | "theme" | "status">>
): Promise<GameSet> {
  const { data, error } = await supabase
    .from("game_sets")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return rowToGameSet(data);
}

export async function deleteGameSet(id: string): Promise<void> {
  const { error } = await supabase.from("game_sets").delete().eq("id", id);
  if (error) throw error;
}

// ─── Character CRUD ───────────────────────────────────────────────────────────

export async function listCharacters(gameSetId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("game_set_id", gameSetId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToCharacter);
}

export async function getCharacter(id: string): Promise<Character | null> {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return rowToCharacter(data);
}

export async function createCharacter(
  input: Pick<Character, "gameSetId" | "displayName" | "attributes"> &
    Partial<Pick<Character, "referenceImageUrl">>
): Promise<Character> {
  const { data, error } = await supabase
    .from("characters")
    .insert({
      game_set_id: input.gameSetId,
      display_name: input.displayName,
      attributes: input.attributes,
      reference_image_url: input.referenceImageUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToCharacter(data);
}

export async function updateCharacter(
  id: string,
  input: Partial<
    Pick<
      Character,
      | "displayName"
      | "attributes"
      | "referenceImageUrl"
      | "generatedImageUrl"
      | "prompt"
      | "balanceWarnings"
    >
  >
): Promise<Character> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.attributes !== undefined) patch.attributes = input.attributes;
  if (input.referenceImageUrl !== undefined)
    patch.reference_image_url = input.referenceImageUrl;
  if (input.generatedImageUrl !== undefined)
    patch.generated_image_url = input.generatedImageUrl;
  if (input.prompt !== undefined) patch.prompt = input.prompt;
  if (input.balanceWarnings !== undefined)
    patch.balance_warnings = input.balanceWarnings;

  const { data, error } = await supabase
    .from("characters")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return rowToCharacter(data);
}

export async function deleteCharacter(id: string): Promise<void> {
  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) throw error;
}

// ─── Balance Report ───────────────────────────────────────────────────────────

export async function saveBalanceReport(
  gameSetId: string,
  report: DeckBalanceReport
): Promise<void> {
  const { error } = await supabase.from("deck_balance_reports").insert({
    game_set_id: gameSetId,
    score: report.score,
    is_playable: report.isPlayable,
    report,
  });
  if (error) throw error;
}

export async function getLatestBalanceReport(
  gameSetId: string
): Promise<DeckBalanceReport | null> {
  const { data, error } = await supabase
    .from("deck_balance_reports")
    .select("report")
    .eq("game_set_id", gameSetId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data.report as DeckBalanceReport;
}

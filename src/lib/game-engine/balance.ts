import type {
  Character,
  CharacterAttributes,
  DeckBalanceReport,
  DeckWarning,
  SuggestedFix,
  TraitDistribution,
} from "@/types/game";
import {
  GAMEPLAY_TRAITS,
  GameplayTrait,
  IDEAL_TRAIT_RANGE,
  getQuestionUsefulness,
} from "./attributes";
import {
  findSimilarPairs,
  computeDeckUniquenessScore,
  SIMILARITY_CRITICAL,
  SIMILARITY_WARNING,
} from "./similarity";

// ─── Required deck size ──────────────────────────────────────────────────────

export const REQUIRED_DECK_SIZE = 24;

// ─── Trait Distribution Analysis ────────────────────────────────────────────

function analyzeTraitDistributions(
  characters: Character[]
): TraitDistribution[] {
  const total = characters.length;
  const distributions: TraitDistribution[] = [];

  for (const trait of GAMEPLAY_TRAITS) {
    const counts = new Map<string, number>();

    for (const char of characters) {
      const val = char.attributes[trait] as string | undefined;
      if (val !== undefined) {
        counts.set(val, (counts.get(val) ?? 0) + 1);
      }
    }

    for (const [value, count] of counts.entries()) {
      distributions.push({
        trait,
        value,
        count,
        percentage: Math.round((count / total) * 100),
        usefulness: getQuestionUsefulness(count, total),
      });
    }
  }

  return distributions.sort((a, b) =>
    a.trait.localeCompare(b.trait) || a.value.localeCompare(b.value)
  );
}

// ─── Distribution Balance Score (0-40) ──────────────────────────────────────

function scoreTraitDistribution(
  distributions: TraitDistribution[],
  total: number
): { points: number; warnings: DeckWarning[] } {
  const warnings: DeckWarning[] = [];
  let penaltyPoints = 0;

  // Group by trait so we can look at the "none vs any" binary for nullable traits
  const byTrait = new Map<string, TraitDistribution[]>();
  for (const d of distributions) {
    const list = byTrait.get(d.trait) ?? [];
    list.push(d);
    byTrait.set(d.trait, list);
  }

  // Check binary traits: if any single value dominates or is almost absent
  const BINARY_TRAITS: GameplayTrait[] = [
    "glasses",
    "hat",
    "facialHair",
    "accessory",
  ];

  for (const trait of BINARY_TRAITS) {
    const entries = byTrait.get(trait) ?? [];
    const noneEntry = entries.find((e) => e.value === "none");
    const noneCount = noneEntry?.count ?? 0;
    const withTrait = total - noneCount;

    if (withTrait < IDEAL_TRAIT_RANGE.min) {
      warnings.push({
        severity: withTrait <= 3 ? "critical" : "warning",
        message: `Too few characters have a non-"none" ${trait} (${withTrait}/${total}). Questions about ${trait} will eliminate very few characters.`,
        affectedTrait: trait,
      });
      penaltyPoints += withTrait <= 3 ? 8 : 4;
    } else if (withTrait > IDEAL_TRAIT_RANGE.max) {
      warnings.push({
        severity: "warning",
        message: `Almost all characters have a non-"none" ${trait} (${withTrait}/${total}). Questions about ${trait} will eliminate very few characters.`,
        affectedTrait: trait,
      });
      penaltyPoints += 4;
    }
  }

  // Check hair colour dominance
  const hairColorEntries = byTrait.get("hairColor") ?? [];
  for (const entry of hairColorEntries) {
    if (entry.count > IDEAL_TRAIT_RANGE.max) {
      warnings.push({
        severity: "warning",
        message: `Hair colour "${entry.value}" appears in ${entry.count}/${total} characters — overrepresented.`,
        affectedTrait: "hairColor",
      });
      penaltyPoints += 3;
    }
  }

  // Check expression dominance
  const expressionEntries = byTrait.get("expression") ?? [];
  for (const entry of expressionEntries) {
    if (entry.count > IDEAL_TRAIT_RANGE.max) {
      warnings.push({
        severity: "warning",
        message: `Expression "${entry.value}" appears in ${entry.count}/${total} characters — too homogeneous.`,
        affectedTrait: "expression",
      });
      penaltyPoints += 3;
    }
  }

  // Check topColor dominance
  const topColorEntries = byTrait.get("topColor") ?? [];
  for (const entry of topColorEntries) {
    if (entry.count > 10) {
      warnings.push({
        severity: "warning",
        message: `Top colour "${entry.value}" appears in ${entry.count}/${total} characters — overrepresented.`,
        affectedTrait: "topColor",
      });
      penaltyPoints += 3;
    }
  }

  const points = Math.max(0, 40 - penaltyPoints);
  return { points, warnings };
}

// ─── Uniqueness Score (0-30) ─────────────────────────────────────────────────

function scoreUniqueness(
  characters: Character[],
  similarPairs: ReturnType<typeof findSimilarPairs>
): { points: number; warnings: DeckWarning[] } {
  const warnings: DeckWarning[] = [];
  const deckUniqueness = computeDeckUniquenessScore(characters);

  const criticalPairs = similarPairs.filter(
    (p) => p.similarityScore >= SIMILARITY_CRITICAL
  );
  const warningPairs = similarPairs.filter(
    (p) =>
      p.similarityScore >= SIMILARITY_WARNING &&
      p.similarityScore < SIMILARITY_CRITICAL
  );

  for (const pair of criticalPairs) {
    warnings.push({
      severity: "critical",
      message: `Characters are ${pair.similarityScore}% similar — almost indistinguishable in play.`,
      affectedCharacterIds: [pair.characterAId, pair.characterBId],
    });
  }

  for (const pair of warningPairs) {
    warnings.push({
      severity: "warning",
      message: `Characters are ${pair.similarityScore}% similar — may cause confusion in play.`,
      affectedCharacterIds: [pair.characterAId, pair.characterBId],
    });
  }

  // Scale to 30 points
  const rawPoints = (deckUniqueness / 100) * 30;
  const pairPenalty = criticalPairs.length * 3 + warningPairs.length * 1;
  const points = Math.max(0, Math.round(rawPoints - pairPenalty));

  return { points, warnings };
}

// ─── Useful Questions Score (0-20) ───────────────────────────────────────────

function scoreUsefulQuestions(
  distributions: TraitDistribution[],
  total: number
): { points: number; warnings: DeckWarning[] } {
  const warnings: DeckWarning[] = [];

  // Each unique trait:value is a potential yes/no question
  const good = distributions.filter((d) => d.usefulness === "good").length;
  const okay = distributions.filter((d) => d.usefulness === "okay").length;
  const poor = distributions.filter((d) => d.usefulness === "poor").length;

  if (poor > 0) {
    warnings.push({
      severity: "info",
      message: `${poor} trait values are poor questions (too skewed to be useful in play).`,
    });
  }

  // Score based on good question count vs total possible
  const total_questions = distributions.length;
  const usefulRatio =
    total_questions > 0 ? (good + okay * 0.5) / total_questions : 0;
  const points = Math.round(usefulRatio * 20);

  return { points, warnings };
}

// ─── Completeness Score (0-10) ───────────────────────────────────────────────

function scoreCompleteness(characters: Character[]): {
  points: number;
  warnings: DeckWarning[];
} {
  const warnings: DeckWarning[] = [];
  const incompleteIds: string[] = [];
  let missingCount = 0;

  for (const char of characters) {
    const missingTraits = GAMEPLAY_TRAITS.filter(
      (t) => char.attributes[t] === undefined || char.attributes[t] === null
    );
    if (missingTraits.length > 0) {
      incompleteIds.push(char.id);
      missingCount += missingTraits.length;
    }
  }

  if (incompleteIds.length > 0) {
    warnings.push({
      severity: "warning",
      message: `${incompleteIds.length} character(s) have incomplete attributes (${missingCount} missing values).`,
      affectedCharacterIds: incompleteIds,
    });
  }

  const completeRatio =
    1 - incompleteIds.length / Math.max(characters.length, 1);
  const points = Math.round(completeRatio * 10);
  return { points, warnings };
}

// ─── Suggested Fixes ─────────────────────────────────────────────────────────

function buildSuggestedFixes(
  characters: Character[],
  distributions: TraitDistribution[]
): SuggestedFix[] {
  const fixes: SuggestedFix[] = [];

  // Find overused top colours and suggest swapping some
  const topColorCounts = new Map<string, number>();
  for (const d of distributions) {
    if (d.trait === "topColor") topColorCounts.set(d.value, d.count);
  }

  const overusedColor = [...topColorCounts.entries()].find(
    ([, count]) => count > 10
  );
  if (overusedColor) {
    const underusedColor = (
      [
        "red",
        "blue",
        "green",
        "yellow",
        "black",
        "white",
        "purple",
        "orange",
      ] as CharacterAttributes["topColor"][]
    ).find((c) => !topColorCounts.has(c) || (topColorCounts.get(c) ?? 0) < 4);

    if (underusedColor) {
      // Suggest changing the last character with the overused colour
      const candidates = characters.filter(
        (c) => c.attributes.topColor === overusedColor[0]
      );
      if (candidates.length > 0) {
        fixes.push({
          characterId: candidates[candidates.length - 1].id,
          trait: "topColor",
          currentValue: overusedColor[0],
          suggestedValue: underusedColor,
          reason: `"${overusedColor[0]}" is used by ${overusedColor[1]} characters. Switching to "${underusedColor}" improves colour balance.`,
        });
      }
    }
  }

  return fixes;
}

// ─── Main Evaluator ──────────────────────────────────────────────────────────

export function evaluateDeck(characters: Character[]): DeckBalanceReport {
  const total = characters.length;
  const allWarnings: DeckWarning[] = [];

  // Deck size check
  if (total !== REQUIRED_DECK_SIZE) {
    allWarnings.push({
      severity: "critical",
      message: `Deck has ${total} characters but exactly ${REQUIRED_DECK_SIZE} are required.`,
    });
  }

  const distributions = analyzeTraitDistributions(characters);
  const similarPairs = findSimilarPairs(characters);

  const { points: distPoints, warnings: distWarnings } =
    scoreTraitDistribution(distributions, total);
  const { points: uniquePoints, warnings: uniqueWarnings } = scoreUniqueness(
    characters,
    similarPairs
  );
  const { points: questionPoints, warnings: questionWarnings } =
    scoreUsefulQuestions(distributions, total);
  const { points: completePoints, warnings: completeWarnings } =
    scoreCompleteness(characters);

  allWarnings.push(
    ...distWarnings,
    ...uniqueWarnings,
    ...questionWarnings,
    ...completeWarnings
  );

  const score = distPoints + uniquePoints + questionPoints + completePoints;

  const criticalWarnings = allWarnings.filter(
    (w) => w.severity === "critical"
  );
  const isPlayable = score >= 50 && criticalWarnings.length === 0;

  const suggestedFixes = buildSuggestedFixes(characters, distributions);

  return {
    isPlayable,
    score,
    warnings: allWarnings,
    traitDistribution: distributions,
    similarPairs,
    suggestedFixes,
  };
}

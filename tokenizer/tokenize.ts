import type { Recipe, TokenizedRecipe } from "./types";

import stopWordsList from "./stop-words.json";
const STOP_WORDS = new Set(stopWordsList as string[]);

/**
 * Strip accents/diacritics so "piña" → "pina", "café" → "cafe".
 * Search then matches whether the user types "pina" or "piña".
 */
function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}

/**
 * Tokenizer: lowercase, strip accents, extract letter sequences, then remove stop words.
 * "Piña colada with cream" → ["pina", "colada", "cream"]. Use the same pipeline for query text when searching.
 */
export function tokenizeText(text: string): string[] {
  const normalized = stripAccents(text.toLowerCase().trim());
  const tokens = normalized.match(/\p{L}+/gu) ?? [];
  return tokens.filter((t) => !STOP_WORDS.has(t));
}

/**
 * Tokenize a single recipe into separate title and tag tokens.
 * Use titleTokens and tagTokens so you can weight title higher when ranking (e.g. 2× for title, 1× for tags).
 */
export function tokenizeRecipe(recipe: Recipe): TokenizedRecipe {
  const title = recipe.title ?? "";
  const tagsText = (recipe.tags ?? []).join(" ");
  return {
    id: recipe.id,
    titleTokens: tokenizeText(title),
    tagTokens: tokenizeText(tagsText),
  };
}

/**
 * Tokenize all recipes. Each result has id, titleTokens, and tagTokens.
 */
export function tokenizeAll(recipes: Recipe[]): TokenizedRecipe[] {
  return recipes.map((recipe) => tokenizeRecipe(recipe));
}

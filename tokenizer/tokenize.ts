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
 * Tokenize a single recipe into title (titleTokens), categories (categoryTokens), and body (tagTokens).
 * tagTokens = desc + directions + ingredients. Rank: title > category > tag.
 */
export function tokenizeRecipe(recipe: Recipe, index?: number): TokenizedRecipe {
  const title = recipe.title ?? "";
  const categories = (recipe.categories ?? []) as string[];
  const desc = (typeof recipe.desc === "string" ? recipe.desc : "") ?? "";
  const directions = Array.isArray(recipe.directions) ? (recipe.directions as string[]).join(" ") : "";
  const ingredients = Array.isArray(recipe.ingredients) ? (recipe.ingredients as string[]).join(" ") : "";
  const bodyText = [desc, directions, ingredients].filter(Boolean).join(" ");
  const id = recipe.id ?? index ?? -1;
  return {
    id,
    titleTokens: tokenizeText(title),
    categoryTokens: tokenizeText(categories.join(" ")),
    tagTokens: tokenizeText(bodyText),
  };
}

/**
 * Tokenize all recipes. Each result has id, titleTokens, categoryTokens, and tagTokens.
 */
export function tokenizeAll(recipes: Recipe[]): TokenizedRecipe[] {
  return recipes.map((recipe, i) => tokenizeRecipe(recipe, i));
}

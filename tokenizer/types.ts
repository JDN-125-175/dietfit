/**
 * Recipe shape from data/full_format_recipes.json (id is assigned when building the index).
 * Tokenization: titleTokens (title), categoryTokens (categories), tagTokens (desc + directions + ingredients).
 */
export type Recipe = {
  id?: number;
  title: string;
  categories?: string[];
  desc?: string | null;
  directions?: string[];
  ingredients?: string[];
  [key: string]: unknown;
};

export type TokenizedRecipe = {
  id: number;
  /** Tokens from the recipe title — highest weight when ranking. */
  titleTokens: string[];
  /** Tokens from categories — rank higher than body. */
  categoryTokens: string[];
  /** Tokens from desc + directions + ingredients (everything else). */
  tagTokens: string[];
};

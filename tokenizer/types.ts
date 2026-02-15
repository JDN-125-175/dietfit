/**
 * Matches one recipe from data/recipes_small.json
 */
export type Recipe = {
  id: number;
  title: string;
  tags: string[];
  calories: number;
  protein: number;
  sodium: number;
};

export type TokenizedRecipe = {
  id: number;
  /** Tokens from the recipe title — give these higher weight when ranking. */
  titleTokens: string[];
  /** Tokens from the recipe tags. */
  tagTokens: string[];
};

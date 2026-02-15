export type Recipe = {
  id: number;
  title: string;
  categories?: string[];
  desc?: string | null;
  directions?: string[];
  ingredients?: string[];
  calories?: number;
  allergens?: string[];
};

export type TokenizedRecipe = {
  id: number;
  titleTokens: string[];
  categoryTokens: string[];
  tagTokens: string[];
};

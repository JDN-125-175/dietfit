/**
 * Run separately: node tokenizer/run.js
 * Reads data/full_format_recipes.json, assigns each recipe an id (0-based index),
 * tokenizes into titleTokens, categoryTokens, and tagTokens (desc + directions + ingredients).
 * Writes data/recipes_tokens.json and data/recipes_documents.json.
 */
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "data");
const inputPath = path.join(dataDir, "full_format_recipes.json");
const tokensPath = path.join(dataDir, "recipes_tokens.json");
const documentsPath = path.join(dataDir, "recipes_documents.json");

const recipes = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

const stopWords = new Set(require("./stop-words.json"));

function stripAccents(text) {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}

function tokenizeText(text) {
  const normalized = stripAccents(text.toLowerCase().trim());
  const tokens = normalized.match(/\p{L}+/gu) ?? [];
  return tokens.filter((t) => !stopWords.has(t));
}

function tokenizeRecipe(recipe, id) {
  const title = recipe.title ?? "";
  const categoriesText = (recipe.categories ?? []).join(" ");
  const desc = recipe.desc ?? "";
  const directions = Array.isArray(recipe.directions) ? recipe.directions.join(" ") : "";
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.join(" ") : "";
  const bodyText = [desc, directions, ingredients].filter(Boolean).join(" ");
  return {
    id,
    titleTokens: tokenizeText(title),
    categoryTokens: tokenizeText(categoriesText),
    tagTokens: tokenizeText(bodyText),
  };
}

const tokenized = recipes.map((r, i) => tokenizeRecipe(r, i));

// Fixed field order so documents are consistent (id first, then common fields, then rest)
const DOCUMENT_KEY_ORDER = [
  "id",
  "title",
  "desc",
  "directions",
  "categories",
  "ingredients",
  "calories",
  "protein",
  "sodium",
  "fat",
  "date",
  "rating",
];
function documentWithOrder(recipe, id) {
  const doc = { id, ...recipe };
  const ordered = {};
  for (const key of DOCUMENT_KEY_ORDER) {
    if (key in doc) ordered[key] = doc[key];
  }
  for (const key of Object.keys(doc)) {
    if (!(key in ordered)) ordered[key] = doc[key];
  }
  return ordered;
}
const documents = recipes.map((r, i) => documentWithOrder(r, i));

fs.writeFileSync(tokensPath, JSON.stringify(tokenized, null, 2), "utf-8");
fs.writeFileSync(documentsPath, JSON.stringify(documents, null, 2), "utf-8");
console.log("Wrote", tokenized.length, "tokenized recipes to data/recipes_tokens.json");
console.log("Wrote", documents.length, "documents to data/recipes_documents.json");

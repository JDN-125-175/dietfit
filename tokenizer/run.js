/**
 * Run separately: node tokenizer/run.js
 * Reads data/recipes_small.json, tokenizes (title + tags), writes data/recipes_tokens.json.
 */
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "data");
const inputPath = path.join(dataDir, "recipes_small.json");
const outputPath = path.join(dataDir, "recipes_tokens.json");

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

function tokenizeRecipe(recipe) {
  const title = recipe.title ?? "";
  const tagsText = (recipe.tags ?? []).join(" ");
  return {
    id: recipe.id,
    titleTokens: tokenizeText(title),
    tagTokens: tokenizeText(tagsText),
  };
}

const tokenized = recipes.map((r) => tokenizeRecipe(r));

fs.writeFileSync(outputPath, JSON.stringify(tokenized, null, 2), "utf-8");
console.log("Wrote", tokenized.length, "tokenized recipes to data/recipes_tokens.json");

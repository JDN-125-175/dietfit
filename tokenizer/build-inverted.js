/**
 * Run after run.js: node tokenizer/build-inverted.js
 * Reads data/recipes_tokens.json, builds an inverted index, writes data/recipes_inverted.json.
 *
 * Inverted index shape: { "term": [ { "id": recipeId, "titleCount": n, "tagCount": n }, ... ], ... }
 * So you can look up which recipes contain a term and how often (for TF-IDF).
 */
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "data");
const inputPath = path.join(dataDir, "recipes_tokens.json");
const outputPath = path.join(dataDir, "recipes_inverted.json");

const tokenized = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

function countToken(tokens, term) {
  return tokens.filter((t) => t === term).length;
}

const index = {};

for (const recipe of tokenized) {
  const { id, titleTokens = [], tagTokens = [] } = recipe;
  const allTerms = [...new Set([...titleTokens, ...tagTokens])];

  for (const term of allTerms) {
    const titleCount = countToken(titleTokens, term);
    const tagCount = countToken(tagTokens, term);
    if (!index[term]) index[term] = [];
    index[term].push({ id, titleCount, tagCount });
  }
}

fs.writeFileSync(outputPath, JSON.stringify(index, null, 2), "utf-8");
console.log(
  "Wrote inverted index with",
  Object.keys(index).length,
  "terms to data/recipes_inverted.json"
);

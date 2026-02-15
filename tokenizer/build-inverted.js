/**
 * Run after run.js: node tokenizer/build-inverted.js
 * Reads data/recipes_tokens.json, builds an inverted index with precomputed TF-IDF scores,
 * writes data/recipes_inverted.json and data/recipes_index_meta.json.
 *
 * Index shape: { "term": [ { "id", "score" }, ... ], ... }
 * score = weighted TF × IDF (so query time only sums scores, no recalculation).
 * Weights: title 3, category 2, tag 1. Change WEIGHTS below and rebuild to tune.
 */
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "data");
const inputPath = path.join(dataDir, "recipes_tokens.json");
const outputPath = path.join(dataDir, "recipes_inverted.json");
const metaPath = path.join(dataDir, "recipes_index_meta.json");

const WEIGHTS = { title: 3, category: 2, tag: 1 };

const tokenized = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
const N = tokenized.length;

function countToken(tokens, term) {
  return tokens.filter((t) => t === term).length;
}

// Build index with counts first
const indexWithCounts = {};
for (const recipe of tokenized) {
  const { id, titleTokens = [], categoryTokens = [], tagTokens = [] } = recipe;
  const allTerms = [...new Set([...titleTokens, ...categoryTokens, ...tagTokens])];
  for (const term of allTerms) {
    const titleCount = countToken(titleTokens, term);
    const categoryCount = countToken(categoryTokens, term);
    const tagCount = countToken(tagTokens, term);
    if (!indexWithCounts[term]) indexWithCounts[term] = [];
    indexWithCounts[term].push({ id, titleCount, categoryCount, tagCount });
  }
}

// Replace counts with precomputed TF-IDF score per (term, doc)
const index = {};
for (const [term, postings] of Object.entries(indexWithCounts)) {
  const df = postings.length;
  const idf = Math.log(N / df);
  index[term] = postings.map(({ id, titleCount, categoryCount, tagCount }) => {
    const weightedTf =
      WEIGHTS.title * titleCount + WEIGHTS.category * categoryCount + WEIGHTS.tag * tagCount;
    const score = weightedTf * idf;
    return { id, score };
  });
}

fs.writeFileSync(outputPath, JSON.stringify(index, null, 2), "utf-8");
fs.writeFileSync(
  metaPath,
  JSON.stringify({ totalDocs: N, weights: WEIGHTS }, null, 2),
  "utf-8"
);
console.log("Wrote inverted index with", Object.keys(index).length, "terms to data/recipes_inverted.json");
console.log("Wrote index meta (totalDocs, weights) to data/recipes_index_meta.json");

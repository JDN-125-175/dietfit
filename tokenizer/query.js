/**
 * Query tokenization for Node (server / CLI). Same pipeline as run.js so search matches the index.
 */
const stopWords = new Set(require("./stop-words.json"));

function stripAccents(text) {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}

function tokenizeText(text) {
  const normalized = stripAccents((text ?? "").toLowerCase().trim());
  const tokens = normalized.match(/\p{L}+/gu) ?? [];
  return tokens.filter((t) => !stopWords.has(t));
}

module.exports = { tokenizeText };

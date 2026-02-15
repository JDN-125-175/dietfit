const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { tokenizeText } = require("./tokenizer/query");

const app = express();
const PORT = 3000;

const documents = JSON.parse(fs.readFileSync("./data/recipes_documents.json", "utf-8"));
const invertedIndex = JSON.parse(fs.readFileSync("./data/recipes_inverted.json", "utf-8"));
const idToDoc = new Map(documents.map((d) => [d.id, d]));

app.use(cors());
app.use(express.json());

app.get("/search", (req, res) => {
  const query = req.query.q ?? "";
  const tokens = tokenizeText(query);

  console.log("[search] query:", JSON.stringify(query), "| tokens:", tokens.length ? tokens.join(", ") : "(none)");

  const scores = {};
  tokens.forEach((term) => {
    const postings = invertedIndex[term] ?? [];
    postings.forEach(({ id, score }) => {
      scores[id] = (scores[id] ?? 0) + score;
    });
  });

  const numMatches = Object.keys(scores).length;
  const topIds = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => Number(id));

  const results = topIds.map((id) => idToDoc.get(id)).filter(Boolean);
  console.log("[search] docs matched:", numMatches, "| returning:", results.length, "results");
  res.json(results);
});

app.get("/recipe/:id", (req, res) => {
  const id = Number(req.params.id);
  const doc = idToDoc.get(id);
  if (!doc) {
    console.log("[recipe] id:", id, "-> not found");
    return res.status(404).json({ error: "Recipe not found" });
  }
  console.log("[recipe] id:", id, "->", doc.title ?? "(no title)");
  res.json(doc);
});

app.listen(PORT, () => console.log(`Search API running at http://localhost:${PORT}`));

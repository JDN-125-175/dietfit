const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { tokenizeText } = require("./tokenizer/query");

const app = express();
const PORT = 3000;
const dataDir = path.join(__dirname, "data");
const LITE = process.argv.includes("--lite");

// Load data in background so server can respond to / immediately (or use mock in --lite)
let documents = null;
let invertedIndex = null;
let idToDoc = null;

function dataReady() {
  return documents !== null && invertedIndex !== null && idToDoc !== null;
}

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  if (dataReady()) {
    res.send("Search API is running. Try /search?q=chicken");
  } else {
    res.send("Search API is running. Loading data... try /search?q=chicken in a minute.");
  }
});

app.get("/search", (req, res) => {
  if (!dataReady()) {
    return res.status(503).json({ error: "Data still loading. Retry in a minute." });
  }
  try {
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
  } catch (err) {
    console.error("[search] error:", err);
    res.status(500).json({ error: String(err.message) });
  }
});

app.get("/recipe/:id", (req, res) => {
  if (!dataReady()) {
    return res.status(503).json({ error: "Data still loading. Retry in a minute." });
  }
  const id = Number(req.params.id);
  const doc = idToDoc.get(id);
  if (!doc) {
    console.log("[recipe] id:", id, "-> not found");
    return res.status(404).json({ error: "Recipe not found" });
  }
  console.log("[recipe] id:", id, "->", doc.title ?? "(no title)");
  res.json(doc);
});

app.get("/recipes", (req, res) => {
  if (!dataReady()) {
    return res.status(503).json({ error: "Data still loading. Retry in a minute." });
  }
  const limit = Math.min(parseInt(req.query.limit, 10) || 15, 100);
  const list = documents.slice(0, limit);
  res.json(list);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Search API running at http://localhost:${PORT}`);
  if (LITE) {
    documents = [{ id: 0, title: "Chicken Soup (test)", calories: 200 }];
    invertedIndex = { chicken: [{ id: 0, score: 1 }], soup: [{ id: 0, score: 1 }] };
    idToDoc = new Map(documents.map((d) => [d.id, d]));
    console.log("Lite mode: using mock data. Try http://localhost:3000/search?q=chicken");
  } else {
    console.log("Loading data in background (this may take 1–2 minutes)...");
    fs.readFile(path.join(dataDir, "recipes_documents.json"), "utf-8", (err, docText) => {
      if (err) {
        console.error("Failed to load documents:", err.message);
        return;
      }
      try {
        documents = JSON.parse(docText);
      } catch (e) {
        console.error("Failed to parse documents:", e.message);
        return;
      }
      console.log("Documents loaded.");
      fs.readFile(path.join(dataDir, "recipes_inverted.json"), "utf-8", (err, indexText) => {
        if (err) {
          console.error("Failed to load index:", err.message);
          return;
        }
        try {
          invertedIndex = JSON.parse(indexText);
        } catch (e) {
          console.error("Failed to parse index:", e.message);
          return;
        }
        idToDoc = new Map(documents.map((d) => [d.id, d]));
        console.log("Index loaded. Ready for search.");
      });
    });
  }
});

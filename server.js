const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { tokenizeText } = require("./tokenizer/query");

const app = express();
const PORT = 3000;
const dataDir = path.join(__dirname, "data");
const LITE = process.argv.includes("--lite");

let documents = null;
let invertedIndex = null;
let idToDoc = null;

function dataReady() {
  return documents !== null && invertedIndex !== null && idToDoc !== null;
}

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send(dataReady() ? "Search API is running." : "Search API is loading...");
});

// search
app.get("/search", (req, res) => {
  if (!dataReady()) {
    return res.status(503).json({ error: "Data still loading. Retry in a minute." });
  }

  try {
    const query = req.query.q ?? "";
    const tokens = tokenizeText(query);

    const minCalories = req.query.minCalories ? Number(req.query.minCalories) : undefined;
    const maxCalories = req.query.maxCalories ? Number(req.query.maxCalories) : undefined;
    const categories = req.query.categories ? req.query.categories.split(",").map(c => c.toLowerCase().trim()) : [];
    const excludeAllergens = req.query.excludeAllergens ? req.query.excludeAllergens.split(",").map(a => a.toLowerCase().trim()) : [];

    console.log("[search] query:", query, "| tokens:", tokens.length ? tokens.join(", ") : "(none)");

    // builds score map
    const scores = {};
    tokens.forEach(term => {
      const postings = invertedIndex[term] ?? [];
      postings.forEach(({ id, score }) => {
        scores[id] = (scores[id] ?? 0) + score;
      });
    });

    // get matched documents sorted by score
    let matchedDocs = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => idToDoc.get(Number(id)))
      .filter(Boolean);

    // apply filters
    matchedDocs = matchedDocs.filter(r => {
      if (minCalories !== undefined && (r.calories ?? 0) < minCalories) return false;
      if (maxCalories !== undefined && (r.calories ?? Infinity) > maxCalories) return false;

      if (categories.length > 0) {
        const recipeCats = (r.categories ?? []).map(c => (c ?? "").toLowerCase().trim());
        const hasCategory = recipeCats.some(c => categories.includes(c));
        if (!hasCategory) return false;
      }

      if (excludeAllergens.length > 0) {
        const searchableFields = [
          r.title ?? "",
          r.description ?? "",
          ...(r.allergens ?? []),
          ...(r.categories ?? []),
          ...(r.ingredients ?? []),
          ...(r.directions ?? []), 
        ].map(f => (f ?? "").toLowerCase().trim());

        // exclude recipe if allergen appears anywhere
        const hasAllergen = searchableFields.some(field =>
          excludeAllergens.some(a => field.includes(a))
        );
        if (hasAllergen) return false;
      }

      return true;
    });

    // pagination
    const offset = parseInt(req.query.offset, 10) || 0;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const pagedResults = matchedDocs.slice(offset, offset + limit);

    console.log("[search] docs matched:", matchedDocs.length, "| returning:", pagedResults.length, "results");
    res.json({
      results: pagedResults,
      total: matchedDocs.length,
      offset,
      limit,
    });
  } catch (err) {
    console.error("[search] error:", err);
    res.status(500).json({ error: String(err.message) });
  }
});

// recipe id
app.get("/recipe/:id", (req, res) => {
  if (!dataReady()) return res.status(503).json({ error: "Data loading..." });

  const id = Number(req.params.id);
  const doc = idToDoc.get(id);

  if (!doc) return res.status(404).json({ error: "Recipe not found" });

  res.json(doc);
});

// default recipes
app.get("/recipes", (req, res) => {
  if (!dataReady()) return res.status(503).json({ error: "Data loading..." });

  const limit = Math.min(parseInt(req.query.limit, 10) || 15, 100);
  const offset = parseInt(req.query.offset, 10) || 0;

  const list = documents.slice(offset, offset + limit);

  res.json({
    results: list,
    total: documents.length,
    offset,
    limit,
  });
});

// loading data
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Search API running at http://localhost:${PORT}`);

  if (LITE) {
    documents = [{ id: 0, title: "Chicken Soup (test)", calories: 200 }];
    invertedIndex = { chicken: [{ id: 0, score: 1 }], soup: [{ id: 0, score: 1 }] };
    idToDoc = new Map(documents.map(d => [d.id, d]));
    console.log("Lite mode: using mock data.");
  } else {
    console.log("Loading data in background...");
    fs.readFile(path.join(dataDir, "recipes_documents.json"), "utf-8", (err, docText) => {
      if (err) return console.error("Failed to load documents:", err.message);

      try {
        documents = JSON.parse(docText);
      } catch (e) {
        return console.error("Failed to parse documents:", e.message);
      }

      fs.readFile(path.join(dataDir, "recipes_inverted.json"), "utf-8", (err, indexText) => {
        if (err) return console.error("Failed to load index:", err.message);

        try {
          invertedIndex = JSON.parse(indexText);
        } catch (e) {
          return console.error("Failed to parse index:", e.message);
        }

        idToDoc = new Map(documents.map(d => [d.id, d]));
        console.log("Index loaded. Ready for search.");
      });
    });
  }
});
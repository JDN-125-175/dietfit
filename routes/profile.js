const express = require("express");
const db = require("../db");
const { authenticate } = require("./middleware");

const router = express.Router();

// All profile routes require authentication
router.use(authenticate);

// ─── Preferences ───

// GET /profile/preferences
router.get("/preferences", (req, res) => {
  const prefs = db.prepare("SELECT dietary_type, calorie_goal, protein_goal, fat_goal, sodium_goal FROM user_preferences WHERE user_id = ?").get(req.user.id);
  res.json(prefs || {});
});

// PUT /profile/preferences
router.put("/preferences", (req, res) => {
  const { dietary_type, calorie_goal, protein_goal, fat_goal, sodium_goal } = req.body;

  db.prepare(`
    UPDATE user_preferences
    SET dietary_type = ?, calorie_goal = ?, protein_goal = ?, fat_goal = ?, sodium_goal = ?
    WHERE user_id = ?
  `).run(dietary_type ?? null, calorie_goal ?? null, protein_goal ?? null, fat_goal ?? null, sodium_goal ?? null, req.user.id);

  res.json({ success: true });
});

// ─── Allergens ───

// GET /profile/allergens
router.get("/allergens", (req, res) => {
  const rows = db.prepare("SELECT allergen FROM user_allergens WHERE user_id = ?").all(req.user.id);
  res.json(rows.map(r => r.allergen));
});

// POST /profile/allergens  — body: { allergen: "dairy" }
router.post("/allergens", (req, res) => {
  const { allergen } = req.body;
  if (!allergen) return res.status(400).json({ error: "Allergen is required." });

  try {
    db.prepare("INSERT INTO user_allergens (user_id, allergen) VALUES (?, ?)").run(req.user.id, allergen.toLowerCase().trim());
    res.status(201).json({ success: true });
  } catch {
    res.status(409).json({ error: "Allergen already added." });
  }
});

// DELETE /profile/allergens/:allergen
router.delete("/allergens/:allergen", (req, res) => {
  db.prepare("DELETE FROM user_allergens WHERE user_id = ? AND allergen = ?").run(req.user.id, req.params.allergen.toLowerCase().trim());
  res.json({ success: true });
});

// ─── Favorites ───

// GET /profile/favorites
router.get("/favorites", (req, res) => {
  const rows = db.prepare("SELECT recipe_id, created_at FROM user_favorites WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(rows);
});

// POST /profile/favorites  — body: { recipe_id: 123 }
router.post("/favorites", (req, res) => {
  const { recipe_id } = req.body;
  if (recipe_id == null) return res.status(400).json({ error: "recipe_id is required." });

  try {
    db.prepare("INSERT INTO user_favorites (user_id, recipe_id) VALUES (?, ?)").run(req.user.id, recipe_id);
    res.status(201).json({ success: true });
  } catch {
    res.status(409).json({ error: "Already in favorites." });
  }
});

// DELETE /profile/favorites/:recipe_id
router.delete("/favorites/:recipe_id", (req, res) => {
  db.prepare("DELETE FROM user_favorites WHERE user_id = ? AND recipe_id = ?").run(req.user.id, Number(req.params.recipe_id));
  res.json({ success: true });
});

// ─── History ───

// POST /profile/history  — body: { recipe_id: 123 }
router.post("/history", (req, res) => {
  const { recipe_id } = req.body;
  if (recipe_id == null) return res.status(400).json({ error: "recipe_id is required." });

  db.prepare("INSERT INTO user_history (user_id, recipe_id) VALUES (?, ?)").run(req.user.id, recipe_id);
  res.json({ success: true });
});

// GET /profile/history
router.get("/history", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const rows = db.prepare("SELECT recipe_id, viewed_at FROM user_history WHERE user_id = ? ORDER BY viewed_at DESC LIMIT ?").all(req.user.id, limit);
  res.json(rows);
});

module.exports = router;

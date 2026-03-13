const express = require("express");
const db = require("../db");
const { authenticate } = require("./middleware");

const router = express.Router();

const CONTENT_WEIGHT = 0.5;
const COLLABORATIVE_WEIGHT = 0.3;
const RULE_WEIGHT = 0.2;

let _documents = null;
let _invertedIndex = null;
let _idToDoc = null;
let _recipeVectors = null;
let _recipeMagnitudes = null;

function setData(documents, invertedIndex, idToDoc) {
  _documents = documents;
  _invertedIndex = invertedIndex;
  _idToDoc = idToDoc;

  console.log("Building recipe vectors for recommendations...");
  _recipeVectors = {};
  for (const [term, postings] of Object.entries(invertedIndex)) {
    for (const posting of postings) {
      if (!_recipeVectors[posting.id]) {
        _recipeVectors[posting.id] = {};
      }
      _recipeVectors[posting.id][term] = posting.score;
    }
  }

  _recipeMagnitudes = {};
  for (const [id, vec] of Object.entries(_recipeVectors)) {
    let mag = 0;
    for (const val of Object.values(vec)) {
      mag += val * val;
    }
    _recipeMagnitudes[id] = Math.sqrt(mag);
  }

  console.log("Recipe vectors built for", Object.keys(_recipeVectors).length, "recipes.");
}

function getRecipeVector(recipeId) {
  return _recipeVectors[recipeId] || {};
}

function getVectorsForRecipes(recipeIds) {
  const vectors = {};
  for (const id of recipeIds) {
    vectors[id] = _recipeVectors[id] || {};
  }
  return vectors;
}

function buildUserProfileVector(favoriteIds) {
  if (favoriteIds.length === 0) return {};

  const vectors = getVectorsForRecipes(favoriteIds);
  const profile = {};
  let count = 0;

  for (const id of favoriteIds) {
    const vec = vectors[id];
    if (!vec || Object.keys(vec).length === 0) continue;
    count++;
    for (const [term, score] of Object.entries(vec)) {
      profile[term] = (profile[term] || 0) + score;
    }
  }

  if (count > 0) {
    for (const term of Object.keys(profile)) {
      profile[term] /= count;
    }
  }

  return profile;
}

function cosineSimilarity(vecA, vecB, magAPrecomputed, magBPrecomputed) {
  let dot = 0;

  const [smaller, larger] = Object.keys(vecA).length <= Object.keys(vecB).length
    ? [vecA, vecB] : [vecB, vecA];

  for (const [term, val] of Object.entries(smaller)) {
    if (larger[term] !== undefined) {
      dot += val * larger[term];
    }
  }

  if (dot === 0) return 0;

  let magA = magAPrecomputed;
  if (magA == null) {
    magA = 0;
    for (const a of Object.values(vecA)) magA += a * a;
    magA = Math.sqrt(magA);
  }

  let magB = magBPrecomputed;
  if (magB == null) {
    magB = 0;
    for (const b of Object.values(vecB)) magB += b * b;
    magB = Math.sqrt(magB);
  }

  const denom = magA * magB;
  return denom === 0 ? 0 : dot / denom;
}

function findClosestFavorite(candidateVector, favoriteVectors) {
  let bestId = null;
  let bestSim = -1;

  for (const [id, vec] of Object.entries(favoriteVectors)) {
    const sim = cosineSimilarity(candidateVector, vec);
    if (sim > bestSim) {
      bestSim = sim;
      bestId = Number(id);
    }
  }

  if (bestId !== null && _idToDoc) {
    const doc = _idToDoc.get(bestId);
    return doc ? doc.title.trim() : null;
  }
  return null;
}

function getCollaborativeScores(userId, userFavoriteIds) {
  if (userFavoriteIds.length === 0) return {};

  const placeholders = userFavoriteIds.map(() => "?").join(",");
  const similarUsers = db.prepare(`
    SELECT DISTINCT user_id FROM user_favorites
    WHERE recipe_id IN (${placeholders}) AND user_id != ?
  `).all(...userFavoriteIds, userId);

  if (similarUsers.length === 0) return {};

  const similarUserIds = similarUsers.map(u => u.user_id);
  const userPlaceholders = similarUserIds.map(() => "?").join(",");

  const coFavorites = db.prepare(`
    SELECT recipe_id, COUNT(DISTINCT user_id) as user_count
    FROM user_favorites
    WHERE user_id IN (${userPlaceholders})
    GROUP BY recipe_id
  `).all(...similarUserIds);

  const favoriteSet = new Set(userFavoriteIds);
  const scores = {};

  for (const row of coFavorites) {
    if (!favoriteSet.has(row.recipe_id)) {
      scores[row.recipe_id] = row.user_count / similarUsers.length;
    }
  }

  return scores;
}

function containsAllergen(recipe, allergens) {
  if (allergens.length === 0) return false;

  const searchable = [
    recipe.title || "",
    recipe.desc || "",
    ...(recipe.allergens || []),
    ...(recipe.categories || []),
    ...(recipe.ingredients || []),
    ...(recipe.directions || []),
  ].map(f => (f || "").toLowerCase());

  return searchable.some(field =>
    allergens.some(a => field.includes(a))
  );
}

function computeRuleScore(recipe, prefs) {
  let score = 0;
  let maxScore = 0;
  const reasons = [];

  if (prefs.calorie_goal && recipe.calories != null) {
    maxScore += 0.35;
    const low = prefs.calorie_goal * 0.8;
    const high = prefs.calorie_goal * 1.2;
    if (recipe.calories >= low && recipe.calories <= high) {
      score += 0.35;
      reasons.push("Fits your calorie goal");
    }
  }

  if (prefs.protein_goal && recipe.protein != null) {
    maxScore += 0.25;
    const diff = Math.abs(recipe.protein - prefs.protein_goal) / prefs.protein_goal;
    if (diff <= 0.3) {
      score += 0.25;
      reasons.push("Matches your protein target");
    }
  }

  if (prefs.fat_goal && recipe.fat != null) {
    maxScore += 0.20;
    const diff = Math.abs(recipe.fat - prefs.fat_goal) / prefs.fat_goal;
    if (diff <= 0.3) {
      score += 0.20;
      reasons.push("Matches your fat target");
    }
  }

  if (prefs.sodium_goal && recipe.sodium != null) {
    maxScore += 0.20;
    const diff = Math.abs(recipe.sodium - prefs.sodium_goal) / prefs.sodium_goal;
    if (diff <= 0.3) {
      score += 0.20;
      reasons.push("Matches your sodium target");
    }
  }

  const normalized = maxScore > 0 ? score / maxScore : 0;

  return { score: normalized, reasons };
}

router.use(authenticate);

router.get("/", (req, res) => {
  if (!_documents || !_invertedIndex || !_idToDoc) {
    return res.status(503).json({ error: "Data still loading." });
  }

  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const offset = parseInt(req.query.offset, 10) || 0;

  const prefs = db.prepare(
    "SELECT dietary_type, calorie_goal, protein_goal, fat_goal, sodium_goal FROM user_preferences WHERE user_id = ?"
  ).get(userId) || {};

  const allergens = db.prepare(
    "SELECT allergen FROM user_allergens WHERE user_id = ?"
  ).all(userId).map(r => r.allergen);

  const favorites = db.prepare(
    "SELECT recipe_id FROM user_favorites WHERE user_id = ?"
  ).all(userId).map(r => r.recipe_id);

  const favoriteSet = new Set(favorites);

  const hasPrefs = prefs.calorie_goal || prefs.protein_goal || prefs.fat_goal || prefs.sodium_goal;
  const hasFavorites = favorites.length > 0;

  let userProfile = {};
  let favoriteVectors = {};
  let userProfileMagnitude = 0;
  if (hasFavorites) {
    userProfile = buildUserProfileVector(favorites);
    favoriteVectors = getVectorsForRecipes(favorites);
    let mag = 0;
    for (const v of Object.values(userProfile)) mag += v * v;
    userProfileMagnitude = Math.sqrt(mag);
  }

  let collabScores = {};
  if (hasFavorites) {
    collabScores = getCollaborativeScores(userId, favorites);
  }

  const hasCollabData = Object.keys(collabScores).length > 0;

  let approach = "popular";
  if (hasFavorites && hasCollabData && hasPrefs) approach = "hybrid";
  else if (hasFavorites && hasPrefs) approach = "hybrid";
  else if (hasFavorites) approach = "content-based";
  else if (hasPrefs) approach = "rule-based";

  const scored = [];

  for (const recipe of _documents) {
    if (favoriteSet.has(recipe.id)) continue;

    if (containsAllergen(recipe, allergens)) continue;

    if (prefs.calorie_goal && recipe.calories != null) {
      const low = prefs.calorie_goal * 0.5;
      const high = prefs.calorie_goal * 1.5;
      if (recipe.calories < low || recipe.calories > high) continue;
    }

    const reasons = [];

    let contentScore = 0;
    if (hasFavorites && Object.keys(userProfile).length > 0) {
      const candidateVector = getRecipeVector(recipe.id);
      const candidateMag = _recipeMagnitudes[recipe.id] || null;
      contentScore = cosineSimilarity(userProfile, candidateVector, userProfileMagnitude, candidateMag);

      if (contentScore > 0.15) {
        const closest = findClosestFavorite(candidateVector, favoriteVectors);
        if (closest) {
          reasons.push(`Similar to "${closest}"`);
        }
      }
    }

    let collabScore = collabScores[recipe.id] || 0;
    if (collabScore > 0) {
      reasons.push("Liked by users with similar taste");
    }

    const ruleResult = computeRuleScore(recipe, prefs);
    const ruleScore = ruleResult.score;
    reasons.push(...ruleResult.reasons);

    let α = CONTENT_WEIGHT;
    let β = COLLABORATIVE_WEIGHT;
    let γ = RULE_WEIGHT;

    if (!hasFavorites) { α = 0; β = 0; γ = 1.0; }
    else if (!hasCollabData && !hasPrefs) { α = 1.0; β = 0; γ = 0; }
    else if (!hasCollabData) { α = 0.65; β = 0; γ = 0.35; }
    else if (!hasPrefs) { α = 0.6; β = 0.4; γ = 0; }

    const finalScore = (α * contentScore) + (β * collabScore) + (γ * ruleScore);

    if (finalScore > 0 || approach === "popular") {
      scored.push({
        recipe,
        score: Math.round(finalScore * 1000) / 1000,
        content_score: Math.round(contentScore * 1000) / 1000,
        collaborative_score: Math.round(collabScore * 1000) / 1000,
        rule_score: Math.round(ruleScore * 1000) / 1000,
        reasons: reasons.length > 0 ? reasons : ["Recommended for you"],
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    const filtered = _documents
      .filter(r => !containsAllergen(r, allergens) && !favoriteSet.has(r.id));

    const fallback = filtered
      .slice(offset, offset + limit)
      .map(recipe => ({
        recipe,
        score: 0,
        content_score: 0,
        collaborative_score: 0,
        rule_score: 0,
        reasons: ["Popular recipe"],
      }));

    return res.json({
      recommendations: fallback,
      approach: "popular",
      total: filtered.length,
      offset,
      limit,
    });
  }

  const results = scored.slice(offset, offset + limit);

  res.json({
    recommendations: results,
    approach,
    total: scored.length,
    offset,
    limit,
  });
});

module.exports = { router, setData };

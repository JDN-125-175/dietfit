/**
 * ============================================================================
 * RECOMMENDATION ENGINE — Hybrid Approach
 * ============================================================================
 *
 * This module implements a hybrid recommendation system that combines three
 * distinct approaches to generate personalized recipe suggestions:
 *
 *   1. RULE-BASED FILTERING
 *      Hand-crafted logic encoding domain knowledge. Recipes are filtered
 *      and scored based on explicit user preferences:
 *        - Exclude recipes containing the user's allergens
 *        - Exclude recipes outside the user's calorie goal range (±20%)
 *        - Boost recipes matching the user's preferred dietary type
 *        - Boost recipes closer to the user's nutritional targets
 *
 *   2. CONTENT-BASED RECOMMENDATION
 *      Uses item feature vectors to find similar items to those a user liked.
 *        - Each recipe has a TF-IDF feature vector (from the inverted index)
 *        - The user's "taste profile" is built by averaging the TF-IDF vectors
 *          of their favorited recipes
 *        - Candidate recipes are scored by cosine similarity between the
 *          candidate's vector and the user's taste profile
 *        - This answers: "what recipes are textually similar to ones you liked?"
 *
 *   3. COLLABORATIVE FILTERING
 *      Uses interaction patterns across multiple users.
 *        - Find all users who favorited the same recipes as the current user
 *        - Collect all OTHER recipes those users also favorited
 *        - Build a frequency histogram — recipes favorited by many similar
 *          users rank higher
 *        - This answers: "users with similar taste also liked these recipes"
 *
 *   HYBRID COMBINATION
 *      The final score blends all three signals:
 *        score = (α × content_score) + (β × collaborative_score) + (γ × rule_score)
 *
 *      Each recommendation includes a `reasons` array explaining WHY it was
 *      recommended (e.g., "Similar to Chicken Stir Fry", "Fits your calorie goal").
 *
 * ============================================================================
 */

const express = require("express");
const db = require("../db");
const { authenticate } = require("./middleware");

const router = express.Router();

// Weights for the hybrid combination
const CONTENT_WEIGHT = 0.5;       // α — how much content similarity matters
const COLLABORATIVE_WEIGHT = 0.3; // β — how much collaborative signal matters
const RULE_WEIGHT = 0.2;          // γ — how much rule-based scoring matters

/**
 * These references are set by the server after data loads.
 * We need access to the recipe documents and TF-IDF inverted index.
 */
let _documents = null;
let _invertedIndex = null;
let _idToDoc = null;

function setData(documents, invertedIndex, idToDoc) {
  _documents = documents;
  _invertedIndex = invertedIndex;
  _idToDoc = idToDoc;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT-BASED: Build TF-IDF feature vectors and compute cosine similarity
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a sparse TF-IDF feature vector for a single recipe.
 *
 * The inverted index maps: term → [{ id, score }, ...]
 * We invert this to get:   recipeId → { term: score, term: score, ... }
 *
 * This is the recipe's "feature vector" — a bag-of-words representation
 * where each dimension is a term and the value is its TF-IDF weight.
 */
function buildRecipeVector(recipeId) {
  const vector = {};
  for (const [term, postings] of Object.entries(_invertedIndex)) {
    for (const posting of postings) {
      if (posting.id === recipeId) {
        vector[term] = posting.score;
        break;
      }
    }
  }
  return vector;
}

/**
 * Pre-build a lookup: recipeId → sparse vector, for all recipes that
 * appear in any favorites list. Called once when computing recommendations.
 *
 * For efficiency, we iterate the inverted index once and assign terms
 * to their respective recipe vectors.
 */
function buildVectorsForRecipes(recipeIds) {
  const vectors = {};
  for (const id of recipeIds) {
    vectors[id] = {};
  }

  // Single pass through the inverted index
  for (const [term, postings] of Object.entries(_invertedIndex)) {
    for (const posting of postings) {
      if (vectors[posting.id] !== undefined) {
        vectors[posting.id][term] = posting.score;
      }
    }
  }

  return vectors;
}

/**
 * Build the user's "taste profile" vector by averaging the TF-IDF vectors
 * of all their favorited recipes.
 *
 * If a user favorited 3 recipes and all 3 mention "chicken" heavily,
 * "chicken" will have a high value in the profile. This captures what
 * ingredients, cooking styles, and categories the user gravitates toward.
 */
function buildUserProfileVector(favoriteIds) {
  if (favoriteIds.length === 0) return {};

  const vectors = buildVectorsForRecipes(favoriteIds);
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

  // Average the accumulated scores
  if (count > 0) {
    for (const term of Object.keys(profile)) {
      profile[term] /= count;
    }
  }

  return profile;
}

/**
 * Cosine similarity between two sparse vectors.
 *
 * cosine(A, B) = (A · B) / (||A|| × ||B||)
 *
 * Ranges from 0 (completely different) to 1 (identical direction).
 * We only iterate over terms present in both vectors (sparse dot product).
 */
function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const [term, a] of Object.entries(vecA)) {
    magA += a * a;
    if (vecB[term] !== undefined) {
      dot += a * vecB[term];
    }
  }

  for (const b of Object.values(vecB)) {
    magB += b * b;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Find the most similar favorite recipe to a candidate (for explanation).
 * Returns the title of the closest match.
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// COLLABORATIVE FILTERING: "Users who liked X also liked Y"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collaborative filtering using a co-favorite histogram.
 *
 * Algorithm:
 *   1. Get all recipe IDs the current user has favorited
 *   2. Find all OTHER users who also favorited any of those same recipes
 *   3. Collect all recipes those similar users favorited
 *   4. Build a frequency histogram: recipe_id → count of similar users who liked it
 *   5. Exclude recipes the current user already favorited
 *   6. Higher count = stronger collaborative signal
 *
 * This is the classic "users who bought X also bought Y" pattern.
 */
function getCollaborativeScores(userId, userFavoriteIds) {
  if (userFavoriteIds.length === 0) return {};

  // Step 1-2: Find users who share at least one favorite with this user
  const placeholders = userFavoriteIds.map(() => "?").join(",");
  const similarUsers = db.prepare(`
    SELECT DISTINCT user_id FROM user_favorites
    WHERE recipe_id IN (${placeholders}) AND user_id != ?
  `).all(...userFavoriteIds, userId);

  if (similarUsers.length === 0) return {};

  // Step 3-4: Get all favorites of those similar users, build histogram
  const similarUserIds = similarUsers.map(u => u.user_id);
  const userPlaceholders = similarUserIds.map(() => "?").join(",");

  const coFavorites = db.prepare(`
    SELECT recipe_id, COUNT(DISTINCT user_id) as user_count
    FROM user_favorites
    WHERE user_id IN (${userPlaceholders})
    GROUP BY recipe_id
  `).all(...similarUserIds);

  // Step 5: Build scores, excluding user's own favorites
  const favoriteSet = new Set(userFavoriteIds);
  const scores = {};

  for (const row of coFavorites) {
    if (!favoriteSet.has(row.recipe_id)) {
      // Normalize by number of similar users so score is 0-1 range
      scores[row.recipe_id] = row.user_count / similarUsers.length;
    }
  }

  return scores;
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE-BASED: Domain logic for filtering and scoring by user preferences
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a recipe contains any of the user's allergens.
 *
 * Searches across all text fields (title, description, ingredients,
 * directions, categories, allergens) to catch allergen mentions anywhere.
 */
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

/**
 * Compute a rule-based score (0 to 1) based on how well a recipe
 * fits the user's nutritional goals.
 *
 * Each matching criterion adds to the score:
 *   - Within calorie goal range (±20%): +0.35
 *   - Close to protein goal:           +0.25
 *   - Close to fat goal:               +0.20
 *   - Close to sodium goal:            +0.20
 *
 * "Close" = within 30% of the goal value.
 */
function computeRuleScore(recipe, prefs) {
  let score = 0;
  let maxScore = 0;
  const reasons = [];

  // Calorie goal fit
  if (prefs.calorie_goal && recipe.calories != null) {
    maxScore += 0.35;
    const low = prefs.calorie_goal * 0.8;
    const high = prefs.calorie_goal * 1.2;
    if (recipe.calories >= low && recipe.calories <= high) {
      score += 0.35;
      reasons.push("Fits your calorie goal");
    }
  }

  // Protein goal fit
  if (prefs.protein_goal && recipe.protein != null) {
    maxScore += 0.25;
    const diff = Math.abs(recipe.protein - prefs.protein_goal) / prefs.protein_goal;
    if (diff <= 0.3) {
      score += 0.25;
      reasons.push("Matches your protein target");
    }
  }

  // Fat goal fit
  if (prefs.fat_goal && recipe.fat != null) {
    maxScore += 0.20;
    const diff = Math.abs(recipe.fat - prefs.fat_goal) / prefs.fat_goal;
    if (diff <= 0.3) {
      score += 0.20;
      reasons.push("Matches your fat target");
    }
  }

  // Sodium goal fit
  if (prefs.sodium_goal && recipe.sodium != null) {
    maxScore += 0.20;
    const diff = Math.abs(recipe.sodium - prefs.sodium_goal) / prefs.sodium_goal;
    if (diff <= 0.3) {
      score += 0.20;
      reasons.push("Matches your sodium target");
    }
  }

  // Normalize: if user has set goals, score is relative to what they set
  // If no goals are set, rule score is 0 (neutral, doesn't hurt)
  const normalized = maxScore > 0 ? score / maxScore : 0;

  return { score: normalized, reasons };
}

// ─────────────────────────────────────────────────────────────────────────────
// HYBRID ENDPOINT: Combine all three approaches
// ─────────────────────────────────────────────────────────────────────────────

router.use(authenticate);

/**
 * GET /recommendations
 *
 * Returns personalized recipe recommendations for the authenticated user.
 *
 * Query params:
 *   - limit (default 20, max 50): number of recommendations to return
 *
 * Response: {
 *   recommendations: [
 *     {
 *       recipe: { id, title, calories, ... },
 *       score: 0.85,
 *       content_score: 0.7,
 *       collaborative_score: 0.5,
 *       rule_score: 0.9,
 *       reasons: ["Similar to Chicken Stir Fry", "Fits your calorie goal", ...]
 *     },
 *     ...
 *   ],
 *   approach: "hybrid" | "content-based" | "collaborative" | "rule-based" | "popular",
 *   total: 20
 * }
 */
router.get("/", (req, res) => {
  if (!_documents || !_invertedIndex || !_idToDoc) {
    return res.status(503).json({ error: "Data still loading." });
  }

  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  // ── Gather user data ──
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

  // ── Determine which approaches we can use ──
  const hasPrefs = prefs.calorie_goal || prefs.protein_goal || prefs.fat_goal || prefs.sodium_goal;
  const hasFavorites = favorites.length > 0;

  // ── Content-based: build user profile from favorites ──
  let userProfile = {};
  let favoriteVectors = {};
  if (hasFavorites) {
    userProfile = buildUserProfileVector(favorites);
    favoriteVectors = buildVectorsForRecipes(favorites);
  }

  // ── Collaborative: get co-favorite histogram scores ──
  let collabScores = {};
  if (hasFavorites) {
    collabScores = getCollaborativeScores(userId, favorites);
  }

  const hasCollabData = Object.keys(collabScores).length > 0;

  // ── Label the approach being used ──
  let approach = "popular"; // fallback
  if (hasFavorites && hasCollabData && hasPrefs) approach = "hybrid";
  else if (hasFavorites && hasPrefs) approach = "hybrid";
  else if (hasFavorites) approach = "content-based";
  else if (hasPrefs) approach = "rule-based";

  // ── Score every candidate recipe ──
  const scored = [];

  for (const recipe of _documents) {
    // Skip recipes the user already favorited
    if (favoriteSet.has(recipe.id)) continue;

    // Rule-based filter: exclude allergens
    if (containsAllergen(recipe, allergens)) continue;

    // Rule-based filter: exclude recipes far outside calorie goal (±50%)
    if (prefs.calorie_goal && recipe.calories != null) {
      const low = prefs.calorie_goal * 0.5;
      const high = prefs.calorie_goal * 1.5;
      if (recipe.calories < low || recipe.calories > high) continue;
    }

    const reasons = [];

    // ── Content-based score ──
    let contentScore = 0;
    if (hasFavorites && Object.keys(userProfile).length > 0) {
      const candidateVector = {};
      // Build candidate vector efficiently from inverted index postings
      for (const term of Object.keys(userProfile)) {
        const postings = _invertedIndex[term];
        if (!postings) continue;
        for (const p of postings) {
          if (p.id === recipe.id) {
            candidateVector[term] = p.score;
            break;
          }
        }
      }
      contentScore = cosineSimilarity(userProfile, candidateVector);

      if (contentScore > 0.15) {
        const closest = findClosestFavorite(candidateVector, favoriteVectors);
        if (closest) {
          reasons.push(`Similar to "${closest}"`);
        }
      }
    }

    // ── Collaborative score ──
    let collabScore = collabScores[recipe.id] || 0;
    if (collabScore > 0) {
      reasons.push("Liked by users with similar taste");
    }

    // ── Rule-based score ──
    const ruleResult = computeRuleScore(recipe, prefs);
    const ruleScore = ruleResult.score;
    reasons.push(...ruleResult.reasons);

    // ── Hybrid combination ──
    // Dynamically adjust weights based on available signals
    let α = CONTENT_WEIGHT;
    let β = COLLABORATIVE_WEIGHT;
    let γ = RULE_WEIGHT;

    if (!hasFavorites) { α = 0; β = 0; γ = 1.0; }
    else if (!hasCollabData && !hasPrefs) { α = 1.0; β = 0; γ = 0; }
    else if (!hasCollabData) { α = 0.65; β = 0; γ = 0.35; }
    else if (!hasPrefs) { α = 0.6; β = 0.4; γ = 0; }

    const finalScore = (α * contentScore) + (β * collabScore) + (γ * ruleScore);

    // Only include if there's some signal
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

  // ── Sort by final score descending ──
  scored.sort((a, b) => b.score - a.score);

  // ── If no personalized results, fall back to popular/top-rated ──
  if (scored.length === 0) {
    const fallback = _documents
      .filter(r => !containsAllergen(r, allergens) && !favoriteSet.has(r.id))
      .slice(0, limit)
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
      total: fallback.length,
    });
  }

  const results = scored.slice(0, limit);

  res.json({
    recommendations: results,
    approach,
    total: results.length,
  });
});

module.exports = { router, setData };

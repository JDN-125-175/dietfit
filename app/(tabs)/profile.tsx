import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../context/auth-context";
import { getApiBaseUrl } from "../../constants/api";
import { useProfileGuard } from "../../context/profile-context";

type FavoriteRecipe = {
  id: number;
  title: string;
  calories?: number;
  categories?: string[];
};

const DIETARY_TYPES = ["None", "Vegetarian", "Vegan", "Keto", "Paleo", "Low-carb"];
const ALL_ALLERGENS = ["fish", "peanut", "tree nut", "dairy", "egg", "soy", "wheat", "shellfish", "gluten"];

export default function ProfileScreen() {
  const { token, user, logout, loading: authLoading } = useAuth();
  const { setChecker } = useProfileGuard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Preferences — local state
  const [dietaryType, setDietaryType] = useState("None");
  const [calorieGoal, setCalorieGoal] = useState("");
  const [proteinGoal, setProteinGoal] = useState("");
  const [fatGoal, setFatGoal] = useState("");
  const [sodiumGoal, setSodiumGoal] = useState("");

  // Allergens — local state, only saved on button press
  const [allergens, setAllergens] = useState<string[]>([]);

  // Saved state from server — used to detect unsaved changes
  const [savedState, setSavedState] = useState({
    dietaryType: "None", calorieGoal: "", proteinGoal: "", fatGoal: "", sodiumGoal: "", allergens: [] as string[],
  });

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const hasUnsavedChanges = () => {
    return dietaryType !== savedState.dietaryType
      || calorieGoal !== savedState.calorieGoal
      || proteinGoal !== savedState.proteinGoal
      || fatGoal !== savedState.fatGoal
      || sodiumGoal !== savedState.sodiumGoal
      || allergens.length !== savedState.allergens.length
      || allergens.some(a => !savedState.allergens.includes(a));
  };

  const discardChanges = () => {
    setDietaryType(savedState.dietaryType);
    setCalorieGoal(savedState.calorieGoal);
    setProteinGoal(savedState.proteinGoal);
    setFatGoal(savedState.fatGoal);
    setSodiumGoal(savedState.sodiumGoal);
    setAllergens([...savedState.allergens]);
    setMessage("");
  };

  // Register the unsaved-changes checker with the tab layout guard
  useEffect(() => {
    setChecker(() => hasUnsavedChanges());
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [prefsRes, allergensRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/profile/preferences`, { headers }),
        fetch(`${getApiBaseUrl()}/profile/allergens`, { headers }),
      ]);

      const prefs = await prefsRes.json();
      const allergenList = await allergensRes.json();

      const dt = prefs.dietary_type || "None";
      const cg = prefs.calorie_goal?.toString() || "";
      const pg = prefs.protein_goal?.toString() || "";
      const fg = prefs.fat_goal?.toString() || "";
      const sg = prefs.sodium_goal?.toString() || "";
      const al = Array.isArray(allergenList) ? allergenList : [];

      setDietaryType(dt);
      setCalorieGoal(cg);
      setProteinGoal(pg);
      setFatGoal(fg);
      setSodiumGoal(sg);
      setAllergens(al);
      setSavedState({ dietaryType: dt, calorieGoal: cg, proteinGoal: pg, fatGoal: fg, sodiumGoal: sg, allergens: al });
    } catch {
      setMessage("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (!authLoading) fetchProfile(); }, [fetchProfile, authLoading]);

  const savePreferences = async () => {
    setSaving(true);
    setMessage("");
    try {
      // Save preferences
      await fetch(`${getApiBaseUrl()}/profile/preferences`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          dietary_type: dietaryType === "None" ? null : dietaryType,
          calorie_goal: calorieGoal ? Number(calorieGoal) : null,
          protein_goal: proteinGoal ? Number(proteinGoal) : null,
          fat_goal: fatGoal ? Number(fatGoal) : null,
          sodium_goal: sodiumGoal ? Number(sodiumGoal) : null,
        }),
      });

      // Sync allergens — add new ones, remove old ones
      const toAdd = allergens.filter(a => !savedState.allergens.includes(a));
      const toRemove = savedState.allergens.filter(a => !allergens.includes(a));

      await Promise.all([
        ...toAdd.map(a =>
          fetch(`${getApiBaseUrl()}/profile/allergens`, {
            method: "POST",
            headers,
            body: JSON.stringify({ allergen: a }),
          })
        ),
        ...toRemove.map(a =>
          fetch(`${getApiBaseUrl()}/profile/allergens/${a}`, {
            method: "DELETE",
            headers,
          })
        ),
      ]);

      setSavedState({
        dietaryType, calorieGoal, proteinGoal, fatGoal, sodiumGoal, allergens: [...allergens],
      });
      setMessage("Preferences saved!");
    } catch {
      setMessage("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAllergen = (allergen: string) => {
    setAllergens(prev =>
      prev.includes(allergen) ? prev.filter(a => a !== allergen) : [...prev, allergen]
    );
  };

  // Favorites
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);

  const fetchFavorites = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/profile/favorites`, { headers });
      const favList = await res.json();
      if (!Array.isArray(favList)) return;

      // Fetch recipe details for each favorite
      const recipes = await Promise.all(
        favList.map(async (f: { recipe_id: number }) => {
          try {
            const r = await fetch(`${getApiBaseUrl()}/recipe/${f.recipe_id}`);
            if (!r.ok) return null;
            return await r.json();
          } catch { return null; }
        })
      );
      setFavorites(recipes.filter(Boolean));
    } catch {}
  }, [token]);

  useEffect(() => { if (!authLoading) fetchFavorites(); }, [fetchFavorites, authLoading]);

  const removeFavorite = async (recipeId: number) => {
    try {
      await fetch(`${getApiBaseUrl()}/profile/favorites/${recipeId}`, {
        method: "DELETE",
        headers,
      });
      setFavorites(prev => prev.filter(f => f.id !== recipeId));
    } catch {}
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text style={styles.heading}>Profile</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{user?.username} — Log out</Text>
        </TouchableOpacity>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {/* Dietary Type */}
      <Text style={styles.label}>Dietary Type</Text>
      <ScrollView horizontal style={{ marginBottom: 16 }}>
        {DIETARY_TYPES.map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, dietaryType === type && styles.chipSelected]}
            onPress={() => setDietaryType(type)}
          >
            <Text style={[styles.chipText, dietaryType === type && styles.chipTextSelected]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Nutrition Goals */}
      <Text style={styles.label}>Daily Nutrition Goals</Text>

      <View style={styles.goalRow}>
        <Text style={styles.goalLabel}>Calories</Text>
        <TextInput
          placeholder="e.g. 2000"
          value={calorieGoal}
          onChangeText={setCalorieGoal}
          keyboardType="numeric"
          style={styles.goalInput}
        />
      </View>

      <View style={styles.goalRow}>
        <Text style={styles.goalLabel}>Protein (g)</Text>
        <TextInput
          placeholder="e.g. 50"
          value={proteinGoal}
          onChangeText={setProteinGoal}
          keyboardType="numeric"
          style={styles.goalInput}
        />
      </View>

      <View style={styles.goalRow}>
        <Text style={styles.goalLabel}>Fat (g)</Text>
        <TextInput
          placeholder="e.g. 65"
          value={fatGoal}
          onChangeText={setFatGoal}
          keyboardType="numeric"
          style={styles.goalInput}
        />
      </View>

      <View style={styles.goalRow}>
        <Text style={styles.goalLabel}>Sodium (mg)</Text>
        <TextInput
          placeholder="e.g. 2300"
          value={sodiumGoal}
          onChangeText={setSodiumGoal}
          keyboardType="numeric"
          style={styles.goalInput}
        />
      </View>

      <TouchableOpacity style={[styles.saveButton, hasUnsavedChanges() && styles.saveButtonUnsaved]} onPress={savePreferences} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.saveText}>{hasUnsavedChanges() ? "Save Changes" : "Save Preferences"}</Text>
        )}
      </TouchableOpacity>

      {/* Allergens */}
      <Text style={[styles.label, { marginTop: 24 }]}>Allergens to Avoid</Text>
      <Text style={styles.sublabel}>Tap to toggle — selected allergens are excluded from recommendations</Text>
      <View style={styles.allergenGrid}>
        {ALL_ALLERGENS.map(a => (
          <TouchableOpacity
            key={a}
            style={[styles.chip, allergens.includes(a) && styles.chipDanger]}
            onPress={() => toggleAllergen(a)}
          >
            <Text style={[styles.chipText, allergens.includes(a) && styles.chipTextSelected]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Favorites */}
      <Text style={[styles.label, { marginTop: 24 }]}>Favorite Recipes</Text>
      {favorites.length === 0 ? (
        <Text style={styles.sublabel}>No favorites yet — tap the favorite button on any recipe to add it here.</Text>
      ) : (
        favorites.map(recipe => (
          <View key={recipe.id} style={styles.favCard}>
            <Link
              href={{ pathname: "/recipe/[id]", params: { id: String(recipe.id) } }}
              style={{ flex: 1 }}
            >
              <Text style={styles.favTitle}>{recipe.title}</Text>
              <Text style={styles.favMeta}>
                {recipe.calories != null ? `${recipe.calories} cal` : ""}
                {recipe.categories && recipe.categories.length > 0
                  ? `  •  ${recipe.categories.slice(0, 3).join(", ")}`
                  : ""}
              </Text>
            </Link>
            <TouchableOpacity onPress={() => removeFavorite(recipe.id)} style={styles.removeButton}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 24, fontWeight: "bold" },
  logoutButton: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#eee" },
  logoutText: { fontSize: 13, color: "#555" },
  message: { color: "#0a7ea4", textAlign: "center", marginBottom: 12, fontSize: 14 },
  label: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  sublabel: { fontSize: 13, color: "#888", marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, marginBottom: 8 },
  chipSelected: { backgroundColor: "#0a7ea4", borderColor: "#0a7ea4" },
  chipDanger: { backgroundColor: "#d32f2f", borderColor: "#d32f2f" },
  chipText: { fontSize: 14, color: "#333" },
  chipTextSelected: { color: "#fff" },
  goalRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  goalLabel: { width: 100, fontSize: 14, color: "#555" },
  goalInput: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, fontSize: 14 },
  saveButton: { backgroundColor: "#0a7ea4", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 12 } as const,
  saveButtonUnsaved: { backgroundColor: "#e65100" },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  allergenGrid: { flexDirection: "row", flexWrap: "wrap" },
  favCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, marginBottom: 10 },
  favTitle: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  favMeta: { fontSize: 13, color: "#555" },
  removeButton: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#fee", marginLeft: 8 },
  removeText: { fontSize: 13, color: "#d32f2f" },
});

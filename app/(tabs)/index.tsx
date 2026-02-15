import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Link } from "expo-router";

type Recipe = {
  id: number;
  title: string;
  categories?: string[];
  allergens?: string[];
  calories?: number;
  ingredients?: string[];
};

const API_BASE = "http://localhost:3000";

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [minCalories, setMinCalories] = useState<number | undefined>();
  const [maxCalories, setMaxCalories] = useState<number | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch recipes from server whenever searchQuery changes
  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      try {
        const queryParam = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : "";
        const res = await fetch(`${API_BASE}/search${queryParam}`);
        if (!res.ok) throw new Error("Failed to fetch recipes");
        const data = await res.json();
        setRecipes(data);
      } catch (err) {
        console.error(err);
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [searchQuery]);

  // Collect all categories and allergens from fetched recipes
  const allCategories = useMemo(() => {
    const cats = recipes.flatMap((r) => r.categories ?? []);
    return Array.from(new Set(cats));
  }, [recipes]);

  const allAllergens = useMemo(() => {
    const als = recipes.flatMap((r) => r.allergens ?? []);
    return Array.from(new Set(als));
  }, [recipes]);

  // Client-side filters: min/max calories, categories, allergens
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      // Min calories
      if (minCalories !== undefined && (r.calories ?? 0) < minCalories) return false;

      // Max calories
      if (maxCalories !== undefined && (r.calories ?? Infinity) > maxCalories) return false;

      // Category filter
      if (selectedCategories.length > 0 && !(r.categories ?? []).some((c) => selectedCategories.includes(c))) {
        return false;
      }

      // Allergens filter
      if (selectedAllergens.length > 0 && (r.allergens ?? []).some((a) => selectedAllergens.includes(a))) {
        return false;
      }

      return true;
    });
  }, [recipes, minCalories, maxCalories, selectedCategories, selectedAllergens]);

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={styles.heading}>Recipes</Text>

      {/* Search */}
      <TextInput
        placeholder="Search recipes..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.input}
      />

      {/* Min/Max Calories side by side */}
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <TextInput
          placeholder="Min calories"
          value={minCalories?.toString() ?? ""}
          onChangeText={(text) => {
            const num = Number(text);
            setMinCalories(!isNaN(num) ? num : undefined);
          }}
          keyboardType="numeric"
          style={[styles.input, { flex: 1, marginRight: 8 }]}
        />
        <TextInput
          placeholder="Max calories"
          value={maxCalories?.toString() ?? ""}
          onChangeText={(text) => {
            const num = Number(text);
            setMaxCalories(!isNaN(num) ? num : undefined);
          }}
          keyboardType="numeric"
          style={[styles.input, { flex: 1 }]}
        />
      </View>

      {/* Category filters */}
      <Text style={styles.subheading}>Categories:</Text>
      <ScrollView horizontal style={{ marginBottom: 12 }}>
        {allCategories.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.filterButton,
              selectedCategories.includes(c) && styles.filterButtonSelected,
            ]}
            onPress={() => {
              setSelectedCategories((prev) =>
                prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
              );
            }}
          >
            <Text
              style={[
                styles.filterText,
                selectedCategories.includes(c) && { color: "#fff" },
              ]}
            >
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Allergen filters */}
      <Text style={styles.subheading}>Allergens:</Text>
      <ScrollView horizontal style={{ marginBottom: 12 }}>
        {allAllergens.map((a) => (
          <TouchableOpacity
            key={a}
            style={[
              styles.filterButton,
              selectedAllergens.includes(a) && styles.filterButtonSelected,
            ]}
            onPress={() => {
              setSelectedAllergens((prev) =>
                prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
              );
            }}
          >
            <Text
              style={[
                styles.filterText,
                selectedAllergens.includes(a) && { color: "#fff" },
              ]}
            >
              {a}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Loading indicator */}
      {loading && <ActivityIndicator size="large" style={{ marginVertical: 20 }} />}

      {/* Recipe cards */}
      {!loading && filteredRecipes.length === 0 && <Text>No recipes found.</Text>}
      {!loading &&
        filteredRecipes.map((r) => (
          <Link
            key={r.id}
            href={{ pathname: "/recipe/[id]", params: { id: String(r.id) } }}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>{r.title}</Text>
            <Text style={styles.cardText}>
              Categories: {(r.categories ?? []).join(", ")}
            </Text>
            {r.calories !== undefined && <Text>Calories: {r.calories}</Text>}
            {r.ingredients && r.ingredients.length > 0 && (
              <Text style={styles.cardText}>
                Ingredients: {r.ingredients.slice(0, 3).join(", ")}…
              </Text>
            )}
          </Link>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  subheading: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 0,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  filterButtonSelected: {
    backgroundColor: "#4caf50",
    borderColor: "#4caf50",
  },
  filterText: { color: "#000" },
  card: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold" },
  cardText: { fontSize: 14, color: "#555" },
});

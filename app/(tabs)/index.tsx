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
  protein?: number;
  fat?: number;
  sodium?: number;
};

const API_BASE = "http://localhost:3000";

// Static common categories and allergens
const COMMON_CATEGORIES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Dessert",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Low-Carb",
];

const COMMON_ALLERGENS = [
  "Dairy",
  "Eggs",
  "Peanuts",
  "Tree Nuts",
  "Soy",
  "Wheat/Gluten",
  "Shellfish",
  "Fish",
  "Sesame",
];

// Map specific foods to broader categories
const CATEGORY_MAP: Record<string, string> = {
  pancake: "Breakfast",
  waffle: "Breakfast",
  omelette: "Breakfast",
  cereal: "Breakfast",
  sandwich: "Lunch",
  burger: "Lunch",
  salad: "Lunch",
  wrap: "Lunch",
  steak: "Dinner",
  pasta: "Dinner",
  curry: "Dinner",
  "chocolate cake": "Dessert",
  brownie: "Dessert",
  cookie: "Dessert",
  chips: "Snack",
  popcorn: "Snack",
  nuts: "Snack",
};

function normalizeCategory(cat: string): string {
  const lower = cat.toLowerCase();
  return CATEGORY_MAP[lower] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}

function normalizeAllergen(a: string): string {
  const l = a.toLowerCase();
  if (l.includes("milk") || l.includes("cheese") || l.includes("dairy")) return "Dairy";
  if (l.includes("egg")) return "Eggs";
  if (l.includes("peanut")) return "Peanuts";
  if (l.includes("tree nut")) return "Tree Nuts";
  if (l.includes("soy")) return "Soy";
  if (l.includes("wheat") || l.includes("gluten")) return "Wheat/Gluten";
  if (l.includes("shellfish")) return "Shellfish";
  if (l.includes("fish")) return "Fish";
  if (l.includes("sesame")) return "Sesame";
  return a.charAt(0).toUpperCase() + a.slice(1);
}

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
        const data: Recipe[] = await res.json();

        // Normalize categories & allergens
        const normalizedData = data.map((r) => ({
          ...r,
          categories: r.categories?.map(normalizeCategory),
          allergens: r.allergens?.map(normalizeAllergen),
        }));

        setRecipes(normalizedData);
      } catch (err) {
        console.error(err);
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [searchQuery]);

  // Client-side filters including min/max calories
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const cal = r.calories ?? 0;

      if (minCalories !== undefined && cal < minCalories) return false;
      if (maxCalories !== undefined && cal > maxCalories) return false;

      if (
        selectedCategories.length > 0 &&
        !(r.categories ?? []).some((c) => selectedCategories.includes(c))
      )
        return false;

      if (
        selectedAllergens.length > 0 &&
        (r.allergens ?? []).some((a) => selectedAllergens.includes(a))
      )
        return false;

      return true;
    });
  }, [recipes, minCalories, maxCalories, selectedCategories, selectedAllergens]);

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={styles.heading}>Recipes</Text>

      {/* Search bar */}
      <TextInput
        placeholder="Search recipes..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.input}
      />

      {/* Min & Max calories */}
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
        {COMMON_CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.filterButton,
              selectedCategories.includes(c) && styles.filterButtonSelected,
            ]}
            onPress={() =>
              setSelectedCategories((prev) =>
                prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
              )
            }
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
        {COMMON_ALLERGENS.map((a) => (
          <TouchableOpacity
            key={a}
            style={[
              styles.filterButton,
              selectedAllergens.includes(a) && styles.filterButtonSelected,
            ]}
            onPress={() =>
              setSelectedAllergens((prev) =>
                prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
              )
            }
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

      {/* No results */}
      {!loading && filteredRecipes.length === 0 && <Text>No recipes found.</Text>}

      {/* Recipe cards */}
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
    marginBottom: 12,
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

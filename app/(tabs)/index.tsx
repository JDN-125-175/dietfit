import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import recipe_document_json from "../../data/recipes_documents.json";
import { Recipe } from "../../types";

export const recipes: Recipe[] = recipe_document_json as Recipe[];

/* ------------------ Debounce Hook ------------------ */
function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/* ------------------ Category Keyword Mapping ------------------ */
const COMMON_CATEGORIES: Record<string, string[]> = {
  Breakfast: ["pancake", "waffle", "omelet", "cereal"],
  Lunch: ["sandwich", "salad", "soup"],
  Dinner: ["pasta", "chicken", "beef", "fish", "vegetables"],
  Snack: ["cookie", "muffin", "fruit", "nuts"],
};

/* ------------------ Common Allergens ------------------ */
const COMMON_ALLERGENS = [
  "fish",
  "peanut",
  "tree nut",
  "dairy",
  "egg",
  "soy",
  "wheat",
];

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [minCalories, setMinCalories] = useState<number | undefined>();
  const [maxCalories, setMaxCalories] = useState<number | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  const debouncedQuery = useDebounce(searchQuery, 250);

  /* ------------------ Filtering Logic ------------------ */
  const filteredRecipes = useMemo(() => {
    const query = debouncedQuery.toLowerCase().trim();
    const lowerCategories = selectedCategories.map(c =>
      c.toLowerCase().trim()
    );
    const lowerAllergens = selectedAllergens.map(a =>
      a.toLowerCase().trim()
    );

    return recipes.filter((r: Recipe) => {
      /* ---------- SEARCH ---------- */
      if (query) {
        const titleMatch = (r.title ?? "")
          .toLowerCase()
          .includes(query);

        const categoryMatch = (r.categories ?? []).some(c =>
          (c ?? "").toLowerCase().includes(query)
        );

        const ingredientMatch = (r.ingredients ?? []).some(i =>
          (i ?? "").toLowerCase().includes(query)
        );

        if (!titleMatch && !categoryMatch && !ingredientMatch)
          return false;
      }

      /* ---------- CALORIES ---------- */
      if (minCalories !== undefined && (r.calories ?? 0) < minCalories)
        return false;

      if (
        maxCalories !== undefined &&
        (r.calories ?? Infinity) > maxCalories
      )
        return false;

      /* ---------- CATEGORY FILTER ---------- */
      if (selectedCategories.length > 0) {
        const recipeCats = (r.categories ?? []).map(c =>
          (c ?? "").toLowerCase().trim()
        );

        const hasCategory = recipeCats.some(c =>
          lowerCategories.includes(c) ||
          lowerCategories.some(sel =>
            COMMON_CATEGORIES[sel]
              ?.map(x => x.toLowerCase())
              .includes(c)
          )
        );

        if (!hasCategory) return false;
      }

      /* ---------- ALLERGEN FILTER (FIXED) ---------- */
      if (selectedAllergens.length > 0) {
        const searchableFields = [
          ...(r.allergens ?? []),
          ...(r.categories ?? []),
          ...(r.ingredients ?? []),
        ].map(field =>
          (field ?? "").toLowerCase().trim()
        );

        const hasAllergen = searchableFields.some(field =>
          lowerAllergens.some(sel => field.includes(sel))
        );

        if (hasAllergen) return false;
      }

      return true;
    });
  }, [
    debouncedQuery,
    minCalories,
    maxCalories,
    selectedCategories,
    selectedAllergens,
  ]);

  /* ---------- LIMIT HOME PAGE TO 15 ---------- */
  const recipesToShow =
    debouncedQuery === ""
      ? filteredRecipes.slice(0, 15)
      : filteredRecipes;

  /* ------------------ UI ------------------ */
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

      {/* Calories */}
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <TextInput
          placeholder="Min calories"
          value={minCalories?.toString() ?? ""}
          onChangeText={text =>
            setMinCalories(text ? Number(text) : undefined)
          }
          keyboardType="numeric"
          style={[styles.input, { flex: 1, marginRight: 8 }]}
        />
        <TextInput
          placeholder="Max calories"
          value={maxCalories?.toString() ?? ""}
          onChangeText={text =>
            setMaxCalories(text ? Number(text) : undefined)
          }
          keyboardType="numeric"
          style={[styles.input, { flex: 1 }]}
        />
      </View>

      {/* Category Buttons */}
      <Text style={styles.subheading}>Categories:</Text>
      <ScrollView horizontal style={{ marginBottom: 12 }}>
        {Object.keys(COMMON_CATEGORIES).map(c => (
          <TouchableOpacity
            key={c}
            style={[
              styles.filterButton,
              selectedCategories.includes(c) &&
                styles.filterButtonSelected,
            ]}
            onPress={() =>
              setSelectedCategories(prev =>
                prev.includes(c)
                  ? prev.filter(x => x !== c)
                  : [...prev, c]
              )
            }
          >
            <Text style={styles.filterText}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Allergen Buttons */}
      <Text style={styles.subheading}>Avoid Allergens:</Text>
      <ScrollView horizontal style={{ marginBottom: 12 }}>
        {COMMON_ALLERGENS.map(a => (
          <TouchableOpacity
            key={a}
            style={[
              styles.filterButton,
              selectedAllergens.includes(a) &&
                styles.filterButtonSelected,
            ]}
            onPress={() =>
              setSelectedAllergens(prev =>
                prev.includes(a)
                  ? prev.filter(x => x !== a)
                  : [...prev, a]
              )
            }
          >
            <Text style={styles.filterText}>{a}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recipe Cards */}
      {recipesToShow.map(r => (
        <Link
          key={r.id}
          href={{
            pathname: "/recipe/[id]",
            params: { id: String(r.id) },
          }}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>{r.title}</Text>

          {/* First 3 categories only */}
          <Text style={styles.cardText}>
            Categories:{" "}
            {(r.categories ?? [])
              .slice(0, 3)
              .join(", ")}
            {(r.categories ?? []).length > 3 ? ", ..." : ""}
          </Text>

          {/* First 3 ingredients only */}
          <Text style={styles.cardText}>
            Ingredients:{" "}
            {(r.ingredients ?? [])
              .slice(0, 3)
              .join(", ")}
            {(r.ingredients ?? []).length > 3 ? ", ..." : ""}
          </Text>

          {/* Calories */}
          {r.calories !== undefined && (
            <Text>Calories: {r.calories}</Text>
          )}
        </Link>
      ))}

      {recipesToShow.length === 0 && (
        <Text>No recipes found.</Text>
      )}
    </ScrollView>
  );
}

/* ------------------ Styles ------------------ */
const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
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
  filterText: {
    color: "#000",
  },
  card: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  cardText: {
    fontSize: 14,
    color: "#555",
  },
});

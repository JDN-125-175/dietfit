import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { Link } from "expo-router";
import recipe_document_json from '../../data/recipes_documents.json';
import recipes_token_json from '../../data/recipes_tokens.json';

import { Recipe, TokenizedRecipe } from "../../types";

export const recipe_document: Recipe[] = recipe_document_json as Recipe[];
export const recipes_token: TokenizedRecipe[] = recipes_token_json as TokenizedRecipe[];

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [maxCalories, setMaxCalories] = useState<number | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  // Collect all categories and allergens from recipes
  const allCategories = useMemo(() => {
    const cats = recipes.flatMap(r => r.categories ?? []);
    return Array.from(new Set(cats));
  }, []);

  const allAllergens = useMemo(() => {
    const als = recipes.flatMap(r => r.allergens ?? []);
    return Array.from(new Set(als));
  }, []);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r: Recipe) => {
      // Search query in title or categories
      const query = searchQuery.toLowerCase();
      if (query && !(
        r.title.toLowerCase().includes(query) ||
        (r.categories ?? []).some(c => c.toLowerCase().includes(query))
      )) return false;

      // Calories filter
      if (maxCalories !== undefined && (r.calories ?? Infinity) > maxCalories) return false;

      // Category filter
      if (selectedCategories.length > 0 && !(r.categories ?? []).some(c => selectedCategories.includes(c))) {
        return false;
      }

      // Allergens filter
      if (selectedAllergens.length > 0 && (r.allergens ?? []).some(a => selectedAllergens.includes(a))) {
        return false;
      }

      return true;
    });
  }, [searchQuery, maxCalories, selectedCategories, selectedAllergens]);

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
      <TextInput
        placeholder="Max calories"
        value={maxCalories?.toString() ?? ""}
        onChangeText={text => setMaxCalories(text ? Number(text) : undefined)}
        keyboardType="numeric"
        style={styles.input}
      />

      {/* Category filters */}
      <Text style={styles.subheading}>Categories:</Text>
      <ScrollView horizontal style={{ marginBottom: 12 }}>
        {allCategories.map(c => (
          <TouchableOpacity
            key={c}
            style={[
              styles.filterButton,
              selectedCategories.includes(c) && styles.filterButtonSelected
            ]}
            onPress={() => {
              setSelectedCategories(prev =>
                prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
              );
            }}
          >
            <Text style={styles.filterText}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Allergens filters */}
      <Text style={styles.subheading}>Allergens:</Text>
      <ScrollView horizontal style={{ marginBottom: 12 }}>
        {allAllergens.map(a => (
          <TouchableOpacity
            key={a}
            style={[
              styles.filterButton,
              selectedAllergens.includes(a) && styles.filterButtonSelected
            ]}
            onPress={() => {
              setSelectedAllergens(prev =>
                prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
              );
            }}
          >
            <Text style={styles.filterText}>{a}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recipe cards */}
      {filteredRecipes.map(r => (
        <Link
          key={r.id}
          href={{ pathname: "/recipes/[id]", params: { id: String(r.id) } }}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>{r.title}</Text>
          <Text style={styles.cardText}>
            Categories: {(r.categories ?? []).join(", ")}
          </Text>
          {r.calories !== undefined && <Text>Calories: {r.calories}</Text>}
        </Link>
      ))}
      {filteredRecipes.length === 0 && <Text>No recipes found.</Text>}
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

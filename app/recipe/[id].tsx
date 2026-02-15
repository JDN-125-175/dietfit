import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, SearchParams, Link } from "expo-router";

type Recipe = {
  id: number;
  title: string;
  categories?: string[];
  description?: string;
  ingredients?: string[];
  directions?: string[];
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  sodium?: number;
};

const API_BASE = "http://localhost:3000";

export default function RecipePage({ searchParams }: { searchParams: SearchParams }) {
  const { id } = searchParams;
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchRecipe = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/recipe/${id}`);
        if (!res.ok) throw new Error("Recipe not found");
        const data: Recipe = await res.json();
        setRecipe(data);
      } catch (err) {
        console.error(err);
        setRecipe(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  if (loading)
    return <ActivityIndicator size="large" style={styles.loading} />;

  if (!recipe)
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loading}>Recipe not found.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back to Recipes</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <ScrollView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Back to Recipes</Text>
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>{recipe.title}</Text>

      {/* Categories */}
      {recipe.categories && recipe.categories.length > 0 && (
        <View style={styles.categories}>
          {recipe.categories.map((cat) => (
            <Text key={cat} style={styles.category}>
              {cat}
            </Text>
          ))}
        </View>
      )}

      {/* Description */}
      {recipe.description && (
        <Text style={styles.description}>{recipe.description}</Text>
      )}

      {/* Nutritional info */}
      {(recipe.calories || recipe.protein || recipe.fat || recipe.carbs || recipe.sodium) && (
        <View style={styles.nutrition}>
          {recipe.calories !== undefined && <Text>Calories: {recipe.calories}</Text>}
          {recipe.protein !== undefined && <Text>Protein: {recipe.protein} g</Text>}
          {recipe.fat !== undefined && <Text>Fat: {recipe.fat} g</Text>}
          {recipe.carbs !== undefined && <Text>Carbs: {recipe.carbs} g</Text>}
          {recipe.sodium !== undefined && <Text>Sodium: {recipe.sodium} mg</Text>}
        </View>
      )}

      {/* Ingredients */}
      <Text style={styles.sectionTitle}>Ingredients</Text>
      {recipe.ingredients && recipe.ingredients.length > 0 ? (
        recipe.ingredients.map((ing, idx) => (
          <Text key={idx} style={styles.text}>
            • {ing}
          </Text>
        ))
      ) : (
        <Text style={styles.text}>No ingredients listed.</Text>
      )}

      {/* Directions */}
      <Text style={styles.sectionTitle}>Directions</Text>
      {recipe.directions && recipe.directions.length > 0 ? (
        recipe.directions.map((dir, idx) => (
          <Text key={idx} style={styles.text}>
            {idx + 1}. {dir}
          </Text>
        ))
      ) : (
        <Text style={styles.text}>No directions provided.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loading: { textAlign: "center", marginTop: 20, fontSize: 16 },
  backButton: {
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#eee",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  backButtonText: { color: "#333", fontWeight: "500" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  categories: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  category: {
    backgroundColor: "#eee",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
    fontSize: 14,
  },
  description: { fontSize: 14, marginBottom: 12, fontStyle: "italic" },
  nutrition: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginTop: 12, marginBottom: 6 },
  text: { fontSize: 14, marginBottom: 4 },
});

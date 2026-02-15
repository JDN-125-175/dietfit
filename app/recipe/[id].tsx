import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SearchParams } from "expo-router";

type Recipe = {
  id: number;
  title: string;
  categories?: string[];
  ingredients?: string[];
  directions?: string[];
  calories?: number;
};

const API_BASE = "http://localhost:3000";

export default function RecipePage({ searchParams }: { searchParams: SearchParams }) {
  const { id } = searchParams;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchRecipe = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/recipe/${id}`);
        if (!res.ok) throw new Error("Recipe not found");
        const data = await res.json();
        setRecipe(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  if (loading) return <Text style={styles.loading}>Loading...</Text>;
  if (!recipe) return <Text style={styles.loading}>Recipe not found.</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{recipe.title}</Text>
      {recipe.calories && <Text style={styles.calories}>{recipe.calories} cal</Text>}
      {recipe.categories && (
        <View style={styles.categories}>
          {recipe.categories.map((cat) => (
            <Text key={cat} style={styles.category}>{cat}</Text>
          ))}
        </View>
      )}
      <Text style={styles.sectionTitle}>Ingredients</Text>
      {recipe.ingredients?.map((ing, idx) => (
        <Text key={idx} style={styles.text}>• {ing}</Text>
      ))}
      <Text style={styles.sectionTitle}>Directions</Text>
      {recipe.directions?.map((dir, idx) => (
        <Text key={idx} style={styles.text}>{idx + 1}. {dir}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  loading: { textAlign: "center", marginTop: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  calories: { fontSize: 14, color: "#555", marginBottom: 8 },
  categories: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  category: { backgroundColor: "#eee", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginTop: 12, marginBottom: 6 },
  text: { fontSize: 14, marginBottom: 4 },
});

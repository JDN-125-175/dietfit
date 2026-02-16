import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getApiBaseUrl } from "../../constants/api";

export const unstable_settings = {
  headerShown: false,
};

type Recipe = {
  id: number;
  title: string;
  description?: string;
  categories?: string[];
  allergens?: string[];
  calories?: number;
  protein?: number;
  fat?: number;
  sodium?: number;
  ingredients?: string[];
  directions?: string[];
};

export default function RecipePage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchRecipe = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${getApiBaseUrl()}/recipe/${id}`);
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
    return <ActivityIndicator size="large" style={{ marginTop: 20 }} />;

  if (!recipe)
    return <Text style={styles.loading}>Recipe not found.</Text>;

  return (
    <ScrollView style={styles.container}>
      {/* Custom Back button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Title & description */}
      <Text style={styles.title}>{recipe.title}</Text>
      {recipe.description && (
        <Text style={styles.description}>{recipe.description}</Text>
      )}

      {/* Nutrition info */}
      <View style={styles.nutrition}>
        {recipe.calories !== undefined && <Text>Calories: {recipe.calories}</Text>}
        {recipe.protein !== undefined && <Text>Protein: {recipe.protein}g</Text>}
        {recipe.fat !== undefined && <Text>Fat: {recipe.fat}g</Text>}
        {recipe.sodium !== undefined && <Text>Sodium: {recipe.sodium}mg</Text>}
      </View>

      {/* Categories */}
      {recipe.categories && (
        <View style={styles.row}>
          {recipe.categories.map((c) => (
            <View key={c} style={styles.badge}>
              <Text style={styles.badgeText}>{c}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Allergens */}
      {recipe.allergens && (
        <View style={styles.row}>
          {recipe.allergens.map((a) => (
            <View key={a} style={[styles.badge, { backgroundColor: "#f88" }]}>
              <Text style={styles.badgeText}>{a}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Ingredients */}
      <Text style={styles.sectionTitle}>Ingredients</Text>
      {recipe.ingredients?.map((ing, idx) => (
        <Text key={idx} style={styles.text}>
          • {ing}
        </Text>
      ))}

      {/* Directions */}
      <Text style={styles.sectionTitle}>Directions</Text>
      {recipe.directions?.map((dir, idx) => (
        <Text key={idx} style={styles.text}>
          {idx + 1}. {dir}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  loading: { textAlign: "center", marginTop: 20 },
  backButton: { marginBottom: 12 },
  backText: { color: "#007aff", fontSize: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  description: { fontSize: 14, marginBottom: 12 },
  nutrition: { marginBottom: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  badge: {
    backgroundColor: "#eee",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  badgeText: { fontSize: 12, color: "#333" },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginTop: 12, marginBottom: 6 },
  text: { fontSize: 14, marginBottom: 4 },
});

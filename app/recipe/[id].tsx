import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getApiBaseUrl } from "../../constants/api";
import { useAuth } from "../../context/auth-context";
import { favoritesEvent } from "../../context/favorites-event";

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
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const { token } = useAuth();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

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

    const checkFavorite = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/profile/favorites`, { headers });
        const favs = await res.json();
        if (Array.isArray(favs)) {
          setIsFavorite(favs.some((f: { recipe_id: number }) => f.recipe_id === Number(id)));
        }
      } catch {}
    };

    // Log view history
    const logView = async () => {
      try {
        await fetch(`${getApiBaseUrl()}/profile/history`, {
          method: "POST",
          headers,
          body: JSON.stringify({ recipe_id: Number(id) }),
        });
      } catch {}
    };

    fetchRecipe();
    checkFavorite();
    logView();
  }, [id]);

  const toggleFavorite = async () => {
    if (!recipe) return;
    setFavLoading(true);
    try {
      if (isFavorite) {
        await fetch(`${getApiBaseUrl()}/profile/favorites/${recipe.id}`, {
          method: "DELETE",
          headers,
        });
        setIsFavorite(false);
        favoritesEvent.emit();
      } else {
        await fetch(`${getApiBaseUrl()}/profile/favorites`, {
          method: "POST",
          headers,
          body: JSON.stringify({ recipe_id: recipe.id }),
        });
        setIsFavorite(true);
        favoritesEvent.emit();
      }
    } catch {
      console.error("Failed to toggle favorite");
    } finally {
      setFavLoading(false);
    }
  };

  if (loading)
    return <ActivityIndicator size="large" style={{ marginTop: 20 }} />;

  if (!recipe)
    return <Text style={styles.loading}>Recipe not found.</Text>;

  return (
    <ScrollView style={styles.container}>
      {/* Title & favorite button */}
      <View style={styles.titleRow}>
        <Text style={[styles.title, { flex: 1 }]}>{recipe.title}</Text>
        <TouchableOpacity
          onPress={toggleFavorite}
          disabled={favLoading}
          style={[styles.favButton, isFavorite && styles.favButtonActive]}
        >
          <Text style={[styles.favText, isFavorite && styles.favTextActive]}>
            {favLoading ? "..." : isFavorite ? "Favorited" : "Favorite"}
          </Text>
        </TouchableOpacity>
      </View>

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
  titleRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "bold" },
  favButton: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginLeft: 8 },
  favButtonActive: { backgroundColor: "#0a7ea4", borderColor: "#0a7ea4" },
  favText: { fontSize: 14, color: "#555" },
  favTextActive: { color: "#fff" },
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

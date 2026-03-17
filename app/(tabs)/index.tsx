import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import { Recipe } from "../../types";
import { getApiBaseUrl } from "../../constants/api";
import { useAuth } from "../../context/auth-context";

function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

const COMMON_CATEGORIES: Record<string, string[]> = {
  Breakfast: ["pancake", "waffle", "omelet", "cereal"],
  Lunch: ["sandwich", "salad", "soup"],
  Dinner: ["pasta", "chicken", "beef", "fish", "vegetables"],
  Snack: ["cookie", "muffin", "fruit", "nuts"],
};

const COMMON_ALLERGENS = ["fish", "peanut", "tree nut", "dairy", "egg", "soy", "wheat"];

export default function Index() {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [minCalories, setMinCalories] = useState<number | undefined>();
  const [maxCalories, setMaxCalories] = useState<number | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;
  const [total, setTotal] = useState(0);

  const debouncedQuery = useDebounce(searchQuery, 250);

  // reset page when query or filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, minCalories, maxCalories, selectedCategories, selectedAllergens]);

  // fetch recipes
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const hasFilters = debouncedQuery.trim() !== ""
          || minCalories !== undefined || maxCalories !== undefined
          || selectedCategories.length > 0 || selectedAllergens.length > 0;

        let url = hasFilters
          ? `${getApiBaseUrl()}/search?q=${debouncedQuery}`
            + `&offset=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`
            + `&minCalories=${minCalories ?? ""}`
            + `&maxCalories=${maxCalories ?? ""}`
            + `&categories=${selectedCategories.join(",")}`
            + `&excludeAllergens=${selectedAllergens.join(",")}`
          : `${getApiBaseUrl()}/recipes?offset=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`;

        const res = await fetch(url);
        const data = await res.json();

        setRecipes(Array.isArray(data.results) ? data.results : []);
        setTotal(data.total ?? 0);
      } catch (err) {
        console.error("Fetch error:", err);
        setRecipes([]);
        setTotal(0);
      }
    };

    fetchRecipes();
  }, [debouncedQuery, page, minCalories, maxCalories, selectedCategories, selectedAllergens]);

  return (
    <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={styles.heading}>Recipes</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{user?.username} — Log out</Text>
        </TouchableOpacity>
      </View>

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
          onChangeText={text => setMinCalories(text ? Number(text) : undefined)}
          keyboardType="numeric"
          style={[styles.input, { flex: 1, marginRight: 8 }]}
        />
        <TextInput
          placeholder="Max calories"
          value={maxCalories?.toString() ?? ""}
          onChangeText={text => setMaxCalories(text ? Number(text) : undefined)}
          keyboardType="numeric"
          style={[styles.input, { flex: 1 }]}
        />
      </View>

      {/* Categories */}
      <Text style={styles.subheading}>Categories:</Text>
      <ScrollView horizontal style={{ marginBottom: 12 }}>
        {Object.keys(COMMON_CATEGORIES).map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.filterButton, selectedCategories.includes(c) && styles.filterButtonSelected]}
            onPress={() =>
              setSelectedCategories(prev =>
                prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
              )
            }
          >
            <Text style={styles.filterText}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Allergens */}
      <Text style={styles.subheading}>Avoid Allergens:</Text>
      <ScrollView horizontal style={{ marginBottom: 12 }}>
        {COMMON_ALLERGENS.map(a => (
          <TouchableOpacity
            key={a}
            style={[styles.filterButton, selectedAllergens.includes(a) && styles.filterButtonSelected]}
            onPress={() =>
              setSelectedAllergens(prev =>
                prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
              )
            }
          >
            <Text style={styles.filterText}>{a}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recipe Cards */}
      {recipes.map(r => (
        <Link
          key={r.id}
          href={{ pathname: "/recipe/[id]", params: { id: String(r.id) } }}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>{r.title}</Text>
          <Text style={styles.cardText}>
            Categories: {(r.categories ?? []).slice(0, 3).join(", ")}
            {(r.categories ?? []).length > 3 ? ", ..." : ""}
          </Text>
          <Text style={styles.cardText}>
            Ingredients: {(r.ingredients ?? []).slice(0, 3).join(", ")}
            {(r.ingredients ?? []).length > 3 ? ", ..." : ""}
          </Text>
          {r.calories !== undefined && <Text>Calories: {r.calories}</Text>}
        </Link>
      ))}

      {/* Pagination */}
      {recipes.length > 0 && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
          <TouchableOpacity
            disabled={page === 0}
            onPress={() => setPage(p => Math.max(0, p - 1))}
            style={[styles.pageButton, page === 0 && { opacity: 0.4 }]}
          >
            <Text>Previous</Text>
          </TouchableOpacity>

          <Text>
            Page {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </Text>

          <TouchableOpacity
            disabled={(page + 1) * PAGE_SIZE >= total}
            onPress={() => setPage(p => p + 1)}
            style={[styles.pageButton, (page + 1) * PAGE_SIZE >= total && { opacity: 0.4 }]}
          >
            <Text>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {recipes.length === 0 && <Text>No recipes found.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: "bold" },
  logoutButton: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#eee" },
  logoutText: { fontSize: 13, color: "#555" },
  subheading: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8, marginBottom: 12 },
  filterButton: { borderWidth: 1, borderColor: "#888", borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, marginRight: 8 },
  filterButtonSelected: { backgroundColor: "#4caf50", borderColor: "#4caf50" },
  filterText: { color: "#000" },
  card: { borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "bold" },
  cardText: { fontSize: 14, color: "#555" },
  pageButton: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 8 },
});

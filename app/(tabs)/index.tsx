import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';

const BACKEND_URL = 'http://localhost:3000'; 

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Vegan', 'Dessert'];
const ALLERGENS = ['nuts', 'dairy', 'gluten']; // might need more 

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [featured, setFeatured] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    maxCalories: undefined as number | undefined,
    excludeAllergens: [] as string[],
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Search effect
  useEffect(() => {
    const term = selectedCategory || query;

    if (!term) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, selectedCategory]);

  // Fetch featured & recent recipes 
  useEffect(() => {
    async function fetchInitial() {
      try {
        const res = await fetch(`${BACKEND_URL}/search?q=`); 
        const data = await res.json();
        setFeatured(data.slice(0, 5));
        setRecent(data.slice(0, 10));
      } catch (err) {
        console.error(err);
      }
    }
    fetchInitial();
  }, []);

  // Filter results locally
  const filteredResults = results.filter((r) => {
    const caloriesOk = !filters.maxCalories || r.calories <= filters.maxCalories;
    const allergensOk =
      filters.excludeAllergens.every(
        (a) => !(r.allergens ?? []).includes(a)
      );
    return caloriesOk && allergensOk;
  });

  // Single recipe card
  const renderRecipeCard = (item: any) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => router.push(`/recipe/${item.id}`)}
      style={styles.item}
    >
      <ThemedText type="subtitle">{item.title}</ThemedText>
      <Text>Calories: {item.calories ?? 'N/A'}</Text>
      <Text>Cuisine: {item.categories?.[0] ?? 'N/A'}</Text>
      <Text>Total time: {item.totalTime ?? 'N/A'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <ThemedText type="title" style={{ marginBottom: 16 }}>
        Welcome to DietFit!
      </ThemedText>

      {/* Search Bar */}
      <TextInput
        placeholder="Search recipes..."
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setSelectedCategory(null); // reset category when typing
        }}
        style={styles.input}
      />
      {loading && <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 8 }} />}

      {/* Filters */}
      <View style={{ marginBottom: 12 }}>
        {/* Max Calories */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ marginRight: 8 }}>Max Calories:</Text>
          <TextInput
            style={styles.filterInput}
            keyboardType="numeric"
            placeholder="e.x. 500"
            onChangeText={(text) =>
              setFilters((f) => ({ ...f, maxCalories: text ? parseInt(text) : undefined }))
            }
          />
        </View>

        {/* Allergens */}
        <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
          Allergens
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {ALLERGENS.map((allergen) => (
            <TouchableOpacity
              key={allergen}
              style={{
                ...styles.categoryButton,
                backgroundColor: filters.excludeAllergens.includes(allergen) ? '#FFCCCC' : '#E6F4FE',
              }}
              onPress={() => {
                setFilters((f) => {
                  const newAllergens = f.excludeAllergens.includes(allergen)
                    ? f.excludeAllergens.filter((a) => a !== allergen)
                    : [...f.excludeAllergens, allergen];
                  return { ...f, excludeAllergens: newAllergens };
                });
              }}
            >
              <ThemedText type="defaultSemiBold">{allergen}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Conditional Rendering: Search results or Home content */}
      {query.length > 0 || selectedCategory ? (
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => renderRecipeCard(item)}
          ListEmptyComponent={() => !loading && <Text>No recipes found.</Text>}
        />
      ) : (
        <ScrollView>
          {/* Featured Recipes */}
          <ThemedText type="subtitle" style={{ marginVertical: 8 }}>
            Featured Recipes
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {featured.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/recipe/${item.id}`)}
              >
                <Image
                  source={require('@/assets/images/icon.png')} // placeholder image
                  style={styles.cardImage}
                />
                <ThemedText type="defaultSemiBold" style={{ textAlign: 'center', marginTop: 4 }}>
                  {item.title}
                </ThemedText>
                <Text style={styles.cardText}>Calories: {item.calories ?? 'N/A'}</Text>
                <Text style={styles.cardText}>Cuisine: {item.categories?.[0] ?? 'N/A'}</Text>
                <Text style={styles.cardText}>Total time: {item.totalTime ?? 'N/A'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Categories */}
          <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
            Categories
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={{
                  ...styles.categoryButton,
                  backgroundColor: selectedCategory === cat ? '#A1CEDC' : '#E6F4FE',
                }}
                onPress={() => {
                  setSelectedCategory(cat);
                  setQuery('');
                }}
              >
                <ThemedText type="defaultSemiBold">{cat}</ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Recent Recipes */}
          <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
            Recent Recipes
          </ThemedText>
          <FlatList
            data={recent}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => renderRecipeCard(item)}
            scrollEnabled={false}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  filterInput: {
    height: 32,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 8,
    width: 80,
  },
  item: {
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#fefefe',
  },
  card: {
    width: 160,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  cardImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  cardText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

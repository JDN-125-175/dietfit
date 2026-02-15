// app/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import recipe_document from '../../data/recipes_documents.json';
import recipes_token from '../../data/recipes_tokens.json';


const CATEGORY_KEYWORDS = {
  Breakfast: ['pancake', 'waffle', 'cereal', 'egg', 'toast'],
  Lunch: ['sandwich', 'wrap', 'salad', 'burger'],
  Dinner: ['pasta', 'chicken', 'beef', 'fish', 'rice'],
  Dessert: ['cake', 'cookie', 'brownie', 'pie'],
};

const ALLERGY_KEYWORDS = {
  Dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt'],
  Gluten: ['wheat', 'flour', 'bread', 'pasta', 'tortilla'],
  Nuts: ['almond', 'peanut', 'cashew', 'walnut', 'pecan'],
  Egg: ['egg', 'mayonnaise'],
};

export default function SearchPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [results, setResults] = useState(recipe_document);

  useEffect(() => {
    filterRecipes();
  }, [searchTerm, selectedCategory, selectedAllergens]);

  const filterRecipes = () => {
    const term = searchTerm.toLowerCase();

    let filtered = recipes_token.map(recipe => {
      // Compute score based on token matches
      const inTitle = recipe.titleTokens.some(t => t.includes(term)) ? 3 : 0;
      const inCategory = recipe.categoryTokens.some(t => t.includes(term)) ? 2 : 0;
      const inTags = recipe.tagTokens.some(t => t.includes(term)) ? 1 : 0;
      const score = inTitle + inCategory + inTags;
      return { id: recipe.id, score };
    }).filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => recipe_document.find(d => d.id === r.id)!);

    // Filter by selected category keywords
    if (selectedCategory) {
      const keywords = CATEGORY_KEYWORDS[selectedCategory] || [];
      filtered = filtered.filter(recipe =>
        recipe.categories.some(cat =>
          cat.toLowerCase().includes(selectedCategory.toLowerCase())
        ) || keywords.some(k => recipe.categories.some(c => c.toLowerCase().includes(k)))
      );
    }

    // Filter by allergens
    if (selectedAllergens.length > 0) {
      filtered = filtered.filter(recipe => {
        return !selectedAllergens.some(allergen =>
          (ALLERGY_KEYWORDS[allergen] || []).some(keyword =>
            recipe.ingredients.some(ing => ing.toLowerCase().includes(keyword))
          )
        );
      });
    }

    setResults(filtered);
  };

  const toggleAllergen = (allergen: string) => {
    if (selectedAllergens.includes(allergen)) {
      setSelectedAllergens(selectedAllergens.filter(a => a !== allergen));
    } else {
      setSelectedAllergens([...selectedAllergens, allergen]);
    }
  };

  const renderRecipeCard = ({ item }: { item: typeof recipe_document[0] }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/recipe/${item.id}`)}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.info}>Calories: {item.calories}</Text>
      <Text style={styles.info}>Protein: {item.protein}g</Text>
      <Text style={styles.info}>Categories: {item.categories.join(', ')}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search recipes..."
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={styles.searchBar}
      />

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {Object.keys(CATEGORY_KEYWORDS).map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterButton,
              selectedCategory === category && styles.filterButtonSelected
            ]}
            onPress={() => setSelectedCategory(selectedCategory === category ? null : category)}
          >
            <Text style={styles.filterText}>{category}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Allergens Filter */}
      <Text style={styles.allergenTitle}>Allergens:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {Object.keys(ALLERGY_KEYWORDS).map(allergen => (
          <TouchableOpacity
            key={allergen}
            style={[
              styles.filterButton,
              selectedAllergens.includes(allergen) && styles.filterButtonSelected
            ]}
            onPress={() => toggleAllergen(allergen)}
          >
            <Text style={styles.filterText}>{allergen}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={results}
        renderItem={renderRecipeCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  searchBar: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  filterScroll: { marginVertical: 5 },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#eee',
    marginRight: 8,
  },
  filterButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  filterText: { color: '#000' },
  allergenTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  card: {
    padding: 12,
    marginVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  info: { fontSize: 14, color: '#555' },
});

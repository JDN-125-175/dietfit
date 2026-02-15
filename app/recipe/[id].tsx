// app/recipe/[id].tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Import JSON and type it
import recipe_document_json from '../../data/recipes_documents.json';

type Recipe = {
  id: number;
  title: string;
  desc: string | null;
  directions: string[];
  ingredients: string[];
  categories: string[];
  calories: number;
  protein: number;
  fat: number;
  sodium: number;
  rating: number;
  date: string;
};

const recipe_document: Recipe[] = recipe_document_json as Recipe[];

export default function RecipePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = parseInt(id, 10);

  const recipe = recipe_document.find(r => r.id === recipeId);

  if (!recipe) {
    return (
      <View style={styles.center}>
        <Text>Recipe not found!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{recipe.title}</Text>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>Calories: {recipe.calories}</Text>
        <Text style={styles.infoText}>Protein: {recipe.protein}g</Text>
        <Text style={styles.infoText}>Fat: {recipe.fat}g</Text>
        <Text style={styles.infoText}>Sodium: {recipe.sodium}mg</Text>
      </View>

      <Text style={styles.sectionTitle}>Categories</Text>
      <Text>{recipe.categories.join(', ')}</Text>

      <Text style={styles.sectionTitle}>Ingredients</Text>
      {recipe.ingredients.map((ing, idx) => (
        <Text key={idx}>• {ing}</Text>
      ))}

      <Text style={styles.sectionTitle}>Directions</Text>
      {recipe.directions.map((step, idx) => (
        <Text key={idx}>{step}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap' },
  infoText: { fontSize: 14, marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 12, marginBottom: 6 },
});

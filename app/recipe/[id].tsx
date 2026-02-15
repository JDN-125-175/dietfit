// app/recipe/[id].tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';

type Recipe = any; 

type RecipePageProps = {
  params: { id: string };
};

export default function RecipeDetails({ params }: RecipePageProps) {
  const { id } = params; 
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const BACKEND_URL = 'http://localhost:3000';

  useEffect(() => {
    async function fetchRecipe() {
      try {
        const res = await fetch(`${BACKEND_URL}/recipe/${id}`);
        const data = await res.json();
        setRecipe(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecipe();
  }, [id]);

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  if (!recipe) return <Text>Recipe not found</Text>;

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <ThemedText type="title">{recipe.title}</ThemedText>
      <Text>Calories: {recipe.calories ?? 'N/A'}</Text>
      <Text>Protein: {recipe.protein ?? 'N/A'}g</Text>
      <Text>Fat: {recipe.fat ?? 'N/A'}g</Text>
      <Text>Sodium: {recipe.sodium ?? 'N/A'}mg</Text>
      <Text>Categories: {recipe.categories?.join(', ')}</Text>

      <ThemedText type="subtitle" style={{ marginTop: 16 }}>Ingredients:</ThemedText>
      {recipe.ingredients?.map((ing: string, i: number) => (
        <Text key={i}>• {ing}</Text>
      ))}

      <ThemedText type="subtitle" style={{ marginTop: 16 }}>Directions:</ThemedText>
      {recipe.directions?.map((step: string, i: number) => (
        <Text key={i}>{i + 1}. {step}</Text>
      ))}
    </ScrollView>
  );
}

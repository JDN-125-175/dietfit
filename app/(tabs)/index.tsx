import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';

const BACKEND_URL = 'http://localhost:3000'; 

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Vegan', 'Dessert'];

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [featured, setFeatured] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  // Search effect
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Load featured & recent recipes on mount
  useEffect(() => {
    async function fetchInitial() {
      try {
        const res = await fetch(`${BACKEND_URL}/search?q=`); // empty query → get top recipes
        const data = await res.json();
        setFeatured(data.slice(0, 5));
        setRecent(data.slice(0, 10));
      } catch (err) {
        console.error(err);
      }
    }
    fetchInitial();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <View style={{ height: 178, width: '100%' }}>
            <ThemedText type="title" style={{ textAlign: 'center', paddingTop: 70 }}>
              DietFit
            </ThemedText>
          </View>
        }
      >
        <ThemedView style={{ flex: 1, padding: 16 }}>
          {/* Welcome */}
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Welcome!</ThemedText>
            <HelloWave />
          </ThemedView>

          {/* Search Bar */}
          <TextInput
            placeholder="Search recipes..."
            value={query}
            onChangeText={setQuery}
            style={styles.input}
          />

          {loading && <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 8 }} />}

          {query.length > 0 && !loading && (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <ThemedView style={styles.item}>
                  <ThemedText type="subtitle">{item.title}</ThemedText>
                  <Text>Tags: {item.tags.join(', ')}</Text>
                </ThemedView>
              )}
              style={{ maxHeight: 300 }}
            />
          )}

          {/* Featured Recipes Carousel */}
          <ThemedText type="subtitle" style={{ marginVertical: 8 }}>
            Featured Recipes
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {featured.map((item) => (
              <View key={item.id} style={styles.card}>
                <Image
                  source={require('@/assets/images/icon.png')} // placeholder image
                  style={styles.cardImage}
                />
                <ThemedText type="defaultSemiBold" style={{ textAlign: 'center', marginTop: 4 }}>
                  {item.title}
                </ThemedText>
              </View>
            ))}
          </ScrollView>

          {/* Categories Buttons */}
          <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
            Categories
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat} style={styles.categoryButton} onPress={() => setQuery(cat)}>
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
            renderItem={({ item }) => (
              <ThemedView style={styles.item}>
                <ThemedText type="subtitle">{item.title}</ThemedText>
                <Text>Tags: {item.tags.join(', ')}</Text>
              </ThemedView>
            )}
            scrollEnabled={false}
          />
        </ThemedView>
      </ParallaxScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  item: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  card: {
    width: 120,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E6F4FE',
    borderRadius: 20,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

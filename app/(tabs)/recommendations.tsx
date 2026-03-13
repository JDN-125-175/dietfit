import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../context/auth-context";
import { getApiBaseUrl } from "../../constants/api";

type Recommendation = {
  recipe: {
    id: number;
    title: string;
    categories?: string[];
    calories?: number;
    ingredients?: string[];
  };
  score: number;
  content_score: number;
  collaborative_score: number;
  rule_score: number;
  reasons: string[];
};

const PAGE_SIZE = 15;

export default function RecommendationsScreen() {
  const { token, loading: authLoading } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [approach, setApproach] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRecommendations = useCallback(async (pageNum: number) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const offset = pageNum * PAGE_SIZE;
      const res = await fetch(
        `${getApiBaseUrl()}/recommendations?limit=${PAGE_SIZE}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load recommendations.");
        return;
      }

      setRecommendations(data.recommendations || []);
      setApproach(data.approach || "");
      setTotal(data.total ?? 0);
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading) fetchRecommendations(page);
  }, [fetchRecommendations, page, authLoading]);

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>For You</Text>

      {approach ? (
        <Text style={styles.approachLabel}>
          Based on: {approach === "hybrid" ? "your profile, favorites & similar users" :
            approach === "content-based" ? "recipes you've liked" :
            approach === "collaborative" ? "users with similar taste" :
            approach === "rule-based" ? "your nutrition goals" :
            "popular recipes"}
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {recommendations.length === 0 && !error && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No recommendations yet</Text>
          <Text style={styles.emptyText}>
            Set your nutrition goals in the Profile tab and favorite some recipes to get personalized recommendations.
          </Text>
        </View>
      )}

      {recommendations.map((rec) => (
        <Link
          key={rec.recipe.id}
          href={{ pathname: "/recipe/[id]", params: { id: String(rec.recipe.id) } }}
          style={styles.card}
        >
          <View>
            <Text style={styles.cardTitle}>{rec.recipe.title}</Text>

            {/* Reasons */}
            <View style={styles.reasonsRow}>
              {rec.reasons.map((reason, i) => (
                <View key={i} style={styles.reasonBadge}>
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.cardMeta}>
              {rec.recipe.calories != null ? `${rec.recipe.calories} cal` : ""}
              {rec.recipe.categories && rec.recipe.categories.length > 0
                ? `  •  ${rec.recipe.categories.slice(0, 3).join(", ")}`
                : ""}
            </Text>

            {/* Score breakdown */}
            <View style={styles.scoreRow}>
              <Text style={styles.scoreText}>Match: {Math.round(rec.score * 100)}%</Text>
              {rec.content_score > 0 && <Text style={styles.scoreDetail}>Content: {Math.round(rec.content_score * 100)}%</Text>}
              {rec.collaborative_score > 0 && <Text style={styles.scoreDetail}>Collab: {Math.round(rec.collaborative_score * 100)}%</Text>}
              {rec.rule_score > 0 && <Text style={styles.scoreDetail}>Goals: {Math.round(rec.rule_score * 100)}%</Text>}
            </View>
          </View>
        </Link>
      ))}

      {/* Pagination */}
      {total > 0 && (
        <View style={styles.paginationRow}>
          <TouchableOpacity
            disabled={page === 0}
            onPress={() => setPage(p => Math.max(0, p - 1))}
            style={[styles.pageButton, page === 0 && { opacity: 0.4 }]}
          >
            <Text>Previous</Text>
          </TouchableOpacity>

          <Text>Page {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</Text>

          <TouchableOpacity
            disabled={(page + 1) * PAGE_SIZE >= total}
            onPress={() => setPage(p => p + 1)}
            style={[styles.pageButton, (page + 1) * PAGE_SIZE >= total && { opacity: 0.4 }]}
          >
            <Text>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  approachLabel: { fontSize: 13, color: "#888", marginBottom: 16 },
  error: { color: "#d32f2f", marginBottom: 12 },
  emptyState: { marginTop: 40, alignItems: "center", padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 },
  card: { borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  cardMeta: { fontSize: 13, color: "#555", marginBottom: 6 },
  reasonsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  reasonBadge: { backgroundColor: "#e8f5e9", borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10, marginRight: 6, marginBottom: 4 },
  reasonText: { fontSize: 12, color: "#2e7d32" },
  scoreRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scoreText: { fontSize: 13, fontWeight: "600", color: "#0a7ea4" },
  scoreDetail: { fontSize: 12, color: "#999" },
  paginationRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 32 },
  pageButton: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 8 },
});

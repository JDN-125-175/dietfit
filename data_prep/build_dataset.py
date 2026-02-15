import pandas as pd
import json


df = pd.read_csv("epi_r.csv")
df.columns = df.columns.str.strip()

# Identify binary tag columns (0/1 columns)
tag_cols = [
    c for c in df.columns
    if df[c].dropna().isin([0, 1]).all()
]

# Remove duplicate titles
df = df.drop_duplicates(subset=["title"]).copy()

# Create list of active tags
def active_tags(row):
    return [c for c in tag_cols if row[c] == 1]

df["tags"] = df.apply(active_tags, axis=1)

df_small = df[df["tags"].str.len() >= 5].copy()


df_50 = df_small.sample(n=50, random_state=42).reset_index(drop=True)
df_small = df_small.dropna(subset=["calories", "protein", "sodium"])
df_50 = df_small.sample(n=50, random_state=42).reset_index(drop=True)

export = []
for i, row in df_50.iterrows():
    export.append({
        "id": i + 1,
        "title": row["title"],
        "tags": row["tags"],
        "calories": None if pd.isna(row.get("calories")) else float(row["calories"]),
        "protein": None if pd.isna(row.get("protein")) else float(row["protein"]),
        "sodium": None if pd.isna(row.get("sodium")) else float(row["sodium"]),
    })


with open("recipes_small.json", "w", encoding="utf-8") as f:
    json.dump(export, f, indent=2)

print("Wrote recipes_small.json with", len(export), "items")

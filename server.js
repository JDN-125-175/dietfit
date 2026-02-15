const express = require('express');
const fs = require('fs');
const { tokenizeText } = require('./tokenizer');

const app = express();
const PORT = 3000;

const recipes = JSON.parse(fs.readFileSync('./data/recipes_small.json'));
const invertedIndex = JSON.parse(fs.readFileSync('./data/recipes_inverted.json'));

app.use(express.json());

app.get('/search', (req, res) => {
  const query = req.query.q ?? '';
  const tokens = tokenizeText(query);

  const scores = {};

  tokens.forEach((term) => {
    const hits = invertedIndex[term] ?? [];
    hits.forEach(({ id, titleCount, tagCount }) => {
      if (!scores[id]) scores[id] = 0;
      scores[id] += titleCount * 2 + tagCount;
    });
  });

  const results = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => recipes.find((r) => r.id === Number(id)))
    .slice(0, 20); 

  res.json(results);
});

app.listen(PORT, () => console.log(`Search API running at http://localhost:${PORT}`));

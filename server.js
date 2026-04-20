const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Chatbot scraper backend is running.' });
});

// Scrape endpoint
app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'No URL provided.' });
  }

  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BusinessBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Could not fetch website (status ${response.status})` });
    }

    const html = await response.text();

    // Strip tags, scripts, styles to get clean text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000); // limit to first 8000 chars

    res.json({ text, url: targetUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch the website: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

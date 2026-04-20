const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Chatbot scraper backend is running.' });
});

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided.' });

  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

  let text;
  try {
    const pageRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BusinessBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 10000,
    });
    if (!pageRes.ok) return res.status(502).json({ error: `Could not fetch website (HTTP ${pageRes.status})` });
    const html = await pageRes.text();
    text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch the website: ' + err.message });
  }

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Extract business information from the website text below. Return ONLY a raw JSON object with these exact keys (use empty string if not found): {"name":"","type":"","description":"","hours":"","location":"","contact":"","faq":""}. No markdown, no backticks, just JSON.\n\nWebsite text:\n${text}`
        }]
      })
    });
    const aiData = await aiRes.json();
    const raw = aiData.content?.map(b => b.text || '').join('') || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'AI could not parse business info.' });
    const info = JSON.parse(match[0]);
    res.json({ info, url: targetUrl });
  } catch (err) {
    res.status(500).json({ error: 'AI extraction failed: ' + err.message });
  }
});

app.post('/chat', async (req, res) => {
  const { messages, systemPrompt } = req.body;
  if (!messages || !systemPrompt) return res.status(400).json({ error: 'Missing messages or systemPrompt.' });
  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      })
    });
    const data = await aiRes.json();
    const reply = data.content?.map(b => b.text || '').join('') || 'Sorry, I could not respond.';
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Chat failed: ' + err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

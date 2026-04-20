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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
    });
    if (!pageRes.ok) return res.status(502).json({ error: `Could not fetch website (HTTP ${pageRes.status})` });
    const html = await pageRes.text();
    text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000);
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
        max_tokens: 800,
        system: 'You are a data extraction assistant. You always respond with only valid JSON and nothing else. No explanations, no markdown, no code fences. Just a raw JSON object.',
        messages: [{
          role: 'user',
          content: `Read the website text below and extract business info into this exact JSON structure. Use empty string "" for any field you cannot find. Respond with ONLY the JSON object, nothing else.

{
  "name": "company name here",
  "type": "industry or business type here",
  "description": "2-3 sentence description of what they do",
  "hours": "business hours here",
  "location": "address or city/state here",
  "contact": "phone and/or email here",
  "faq": "any pricing, policies, or other useful info here"
}

Website text:
${text}`
        }]
      })
    });

    const aiData = await aiRes.json();

    if (aiData.error) {
      return res.status(500).json({ error: 'Claude API error: ' + aiData.error.message });
    }

    const raw = (aiData.content || []).map(b => b.text || '').join('').trim();

    // Try multiple ways to extract JSON
    let info;
    try {
      // Direct parse first
      info = JSON.parse(raw);
    } catch {
      // Try extracting from within the text
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error('Raw AI response:', raw);
        return res.status(500).json({ error: 'AI returned unexpected format. Raw: ' + raw.slice(0, 200) });
      }
      try {
        info = JSON.parse(match[0]);
      } catch (e) {
        return res.status(500).json({ error: 'Could not parse JSON from AI response.' });
      }
    }

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
    const reply = (data.content || []).map(b => b.text || '').join('') || 'Sorry, I could not respond.';
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Chat failed: ' + err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

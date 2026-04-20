# AI Business Chatbot — Backend Setup Guide

## What's in this folder
- `server.js` — the backend server that fetches & scrapes website content
- `package.json` — dependencies list

---

## Step 1 — Upload to GitHub

1. Go to https://github.com and sign in (or create a free account)
2. Click the **+** button → **New repository**
3. Name it `chatbot-backend`, set it to **Public**, click **Create repository**
4. On the next screen, click **uploading an existing file**
5. Drag and drop both `server.js` and `package.json` into the upload area
6. Click **Commit changes**

---

## Step 2 — Deploy to Render (free)

1. Go to https://render.com and sign in with your GitHub account
2. Click **New +** → **Web Service**
3. Choose **Connect a repository** → select `chatbot-backend`
4. Fill in the settings:
   - **Name:** chatbot-backend (or anything you like)
   - **Region:** pick closest to you
   - **Branch:** main
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
5. Click **Create Web Service**
6. Wait ~2 minutes for it to deploy
7. Copy your live URL — it will look like:
   `https://chatbot-backend-xxxx.onrender.com`

---

## Step 3 — Update the chatbot artifact

Once you have your Render URL, tell Claude:
> "My backend URL is https://chatbot-backend-xxxx.onrender.com"

Claude will update the chatbot to use your live backend automatically.

---

## Notes
- Render's free tier spins down after 15 minutes of inactivity.
  The first request after a sleep may take ~30 seconds to wake up.
- To keep it always-on, upgrade to Render's $7/month Starter plan.
- Your Anthropic API key stays safely inside the Claude artifact — 
  it is never sent to or stored on your backend server.

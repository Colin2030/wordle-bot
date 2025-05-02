
# 🧠 Wordle Telegram Bot

A feature-rich Telegram bot that tracks Wordle scores from your group chat, awards points, posts leaderboards, and roasts (or celebrates) players with AI-powered reactions and GIFs. 🎯

---

## 🔥 Features

- 📝 Automatically logs daily Wordle scores from Telegram messages
- 🧮 Custom scoring system based on number of guesses
- 🏆 Daily and weekly leaderboards (Google Sheets powered)
- 🎉 Double Points Friday & custom rules support
- 🔁 Cron-based daily summaries
- 🤖 GPT-powered custom reactions using OpenAI
- 🎭 Score-based reaction themes via `reactions.js`
- 🖼 Fun GIFs using reliable Giphy links
- ⚙️ Webhook-based for fast, conflict-free performance
- ☁️ Hosted on Render, fully auto-deployable

---

## 💬 Commands

| Command         | Description                        |
|----------------|------------------------------------|
| `/ping`         | Check if the bot is alive          |
| `/leaderboard`  | Show the current day's leaderboard |
| `/rules`        | Show scoring rules and bonus info  |
| `/help`         | List available commands            |

---

## 🌐 Environment Variables

These should be configured in your `.env` file or Render's Environment tab:

| Variable              | Description                                  |
|-----------------------|----------------------------------------------|
| `TELEGRAM_BOT_TOKEN`  | Bot token from [@BotFather](https://t.me/botfather) |
| `GOOGLE_SHEET_ID`     | ID of your leaderboard Google Sheet          |
| `GROUP_CHAT_ID`       | Telegram group ID to monitor                 |
| `GOOGLE_CREDENTIALS_B64` | Base64-encoded credentials.json (for Google Sheets API) |
| `BASE_URL`            | Public URL for webhook (e.g. from Render)    |
| `OPENAI_API_KEY`      | Your OpenAI key for GPT-powered reactions    |

---

## 🛠 Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```
TELEGRAM_BOT_TOKEN=your-telegram-token
GOOGLE_SHEET_ID=your-sheet-id
GROUP_CHAT_ID=your-telegram-group-id
GOOGLE_CREDENTIALS_B64=base64-of-credentials.json
BASE_URL=https://your-service.onrender.com
OPENAI_API_KEY=your-openai-key
```

4. Run locally:
```bash
node final_index.js
```

---

## 🚀 Deploying on Render

1. Push the repo to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Set build command: `npm install`
4. Set start command: `node final_index.js`
5. Add all environment variables
6. Copy your Render URL into `BASE_URL`
7. Register your webhook:

```bash
https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-app.onrender.com/bot<YOUR_TOKEN>
```

---

## 🧠 Credits

Created by Colin2030 + GPT-powered flair ✨  
Inspired by group Wordle madness and a love of healthy competition.

---

## 📜 License

MIT

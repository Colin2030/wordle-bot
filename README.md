# 🧠 Wordle Telegram Bot

A fun Telegram bot that automatically tracks Wordle scores posted in a group chat, assigns points based on performance, and updates a shared Google Sheet leaderboard! 🎯

---

## Features

- 📝 Automatically logs daily Wordle scores.
- 🏆 Daily and weekly leaderboards.
- 🎉 Double Points Friday!
- 🗓️ Scheduled announcements.
- 📈 Google Sheets integration for score tracking.
- 🎯 Fun reactions and memes!

---

## Commands

| Command | Description |
|:--------|:------------|
| `/ping` | Check if the bot is alive |
| `/leaderboard` | See today's top players |
| `/rules` | View the Wordle game rules |
| `/help` | Show available commands |

---

## Environment Variables

The bot uses a `.env` file for sensitive information:

| Variable | Purpose |
|:---------|:--------|
| `TELEGRAM_BOT_TOKEN` | Your bot's API token from @BotFather |
| `GOOGLE_SHEET_ID` | ID of the connected Google Sheet |
| `GROUP_CHAT_ID` | Telegram group chat ID the bot listens to |

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME

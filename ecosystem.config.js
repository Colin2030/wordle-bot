// ecosystem.config.js

module.exports = {
  apps: [
    {
      name: "wordle-bot",
      script: "index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 5,
      min_uptime: "30s",
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
        GROUP_CHAT_ID: process.env.GROUP_CHAT_ID,
      },
    },
  ],
};

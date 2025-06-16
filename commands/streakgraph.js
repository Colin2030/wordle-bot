// /streakgraph — generate a personal 2-week streak graph
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { getAllScores } = require('../utils');
const fs = require('fs');
const path = require('path');

module.exports = function streakgraph(bot, getAllScores, groupChatId) {
  bot.onText(/\/streakgraph(@\w+)?/, async (msg) => {
    const chatId = msg.chat.id;
    if (String(chatId) !== String(groupChatId)) return;
    const player = msg.from.first_name;

    const allScores = await getAllScores();
    const today = new Date();
    const days = 14;
    const dateList = [...Array(days)].map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().slice(0, 10);
    });

    const playerActivity = dateList.map(date => {
      const entry = allScores.find(([d, p, , , a]) => d === date && p === player);
      return entry && entry[4] !== 'X' ? 1 : 0;
    });

    const streaks = [];
    let count = 0;
    for (const val of playerActivity) {
      count = val ? count + 1 : 0;
      streaks.push(count);
    }

    const chartCanvas = new ChartJSNodeCanvas({ width: 800, height: 300 });
    const image = await chartCanvas.renderToBuffer({
      type: 'line',
      data: {
        labels: dateList,
        datasets: [{
          label: `Wordle Streak — ${player}`,
          data: streaks,
          borderColor: 'blue',
          backgroundColor: 'rgba(0,0,255,0.1)',
          tension: 0.3,
          pointRadius: 5
        }]
      },
      options: {
        scales: {
          x: { ticks: { maxRotation: 90, minRotation: 45 } },
          y: { beginAtZero: true, title: { display: true, text: 'Streak Length' } }
        },
        plugins: { legend: { display: false } },
        responsive: false,
        animation: false
      }
    });

    const filePath = path.join(__dirname, `${player}-streak.png`);
    fs.writeFileSync(filePath, image);

    await bot.sendPhoto(chatId, filePath, { caption: `📈 Your streak journey, ${player}! Keep it going! 🔥` });
    fs.unlinkSync(filePath);
  });
};

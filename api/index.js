const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// رابط البوت الخاص بك للمشاركة
const BOT_LINK = 'https://t.me/Dl3dbot'; 
const SHARE_TEXT = encodeURIComponent('شوف بودكاست "على الورق"، محتوى رهيب ويفيدك! 🎙️✨');

bot.start((ctx) => {
  const firstName = ctx.from.first_name;
  const welcomeMessage = `أهلاً بك يا ${firstName} في بودكاست على الورق 🎙️\n\nاضغط على الزر الشفاف بالأسفل لعرض البودكاست.`;

  ctx.reply(welcomeMessage, Markup.inlineKeyboard([
    [Markup.button.webApp('📺 عرض البودكاست', 'https://podcast-ivory-five.vercel.app/')],
    [Markup.button.url('🔗 شارك مع صديق', `https://t.me/share/url?url=${BOT_LINK}&text=${SHARE_TEXT}`)]
  ]));
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      res.status(500).send('Error');
    }
  } else {
    res.status(200).send('Bot is running');
  }
};

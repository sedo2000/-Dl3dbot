const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// أمر البدء /start مع إضافة اسم العضو والزر الشفاف
bot.start((ctx) => {
  const firstName = ctx.from.first_name; // دالة جلب اسم العضو
  const welcomeMessage = `أهلاً بك يا ${firstName} في بودكاست على الورق 🎙️\n\nاضغط على الزر الشفاف بالأسفل لعرض البودكاست.`;

  ctx.reply(welcomeMessage, Markup.inlineKeyboard([
    [Markup.button.webApp('📺 عرض البودكاست', 'https://podcast-ivory-five.vercel.app/')]
  ]));
});

// تصدير البوت للعمل على Vercel
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error');
    }
  } else {
    res.status(200).send('Bot is running');
  }
};

const { Telegraf, Markup } = require('telegraf');

// استدعاء التوكن من متغيرات البيئة
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  return ctx.reply(
    'مرحباً بك! اضغط على الزر أدناه لفتح التطبيق المصغر:',
    Markup.inlineKeyboard([
      Markup.button.webApp('فتح التطبيق', 'https://unfortunately-lemon.vercel.app/')
    ])
  );
});

// إعداد الـ Webhook ليعمل مع Vercel
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
};

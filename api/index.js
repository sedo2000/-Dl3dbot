const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// مصفوفة مؤقتة لتخزين من هم في مرحلة التحقق (ستعمل بشكل جيد في البداية)
const pendingUsers = new Set();

bot.start(async (ctx) => {
  const userId = ctx.from.id;

  // إرسال صورة التحقق
  await ctx.replyWithPhoto('https://od.lk/s/M18zMjc4MDA5NzJf/img_1778128950939.png', {
    caption: 'الرجاء حل الاختبار أعلاه للتأكد من أنك لست حساباً وهمياً:\n\n**كم ناتج 8 + 2؟**'
  });

  // إضافة المستخدم لقائمة الانتظار
  pendingUsers.add(userId);
});

// استقبال الردود النصية للتحقق
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const messageText = ctx.message.text.trim();

  // التحقق إذا كان المستخدم في قائمة الانتظار
  if (pendingUsers.has(userId)) {
    if (messageText === '10') {
      // إزالة المستخدم من قائمة الانتظار
      pendingUsers.delete(userId);

      // إرسال رسالة النجاح مع الزر الشفاف
      return ctx.reply(
        '✅ تم التحقق بنجاح! يمكنك الآن فتح التطبيق:',
        Markup.inlineKeyboard([
          Markup.button.webApp('فتح التطبيق', 'https://unfortunately-lemon.vercel.app/')
        ])
      );
    } else {
      return ctx.reply('❌ إجابة خاطئة، حاول مرة أخرى. كم ناتج 8 + 2؟');
    }
  }

  // إذا لم يكن المستخدم في قائمة الانتظار (أي أنه تم التحقق منه مسبقاً)
  // يمكنك إضافة منطق آخر هنا أو تجاهله
});

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

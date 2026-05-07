const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// مصفوفة لتخزين بيانات الجلسة المؤقتة
const userSessions = {};

bot.start(async (ctx) => {
  const userId = ctx.from.id;

  // إرسال صورة الاختبار وحفظ المعرف لحذفها لاحقاً
  const sentMsg = await ctx.replyWithPhoto('https://od.lk/s/M18zMjc4MDA5NzJf/img_1778128950939.png', {
    caption: 'الرجاء حل الاختبار أعلاه للتأكد من أنك لست حساباً وهمياً:\n\n**كم ناتج 8 + 2؟**'
  });

  userSessions[userId] = {
    captchaMessageId: sentMsg.message_id,
    isVerified: false
  };
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const messageText = ctx.message.text.trim();
  const session = userSessions[userId];

  if (session && !session.isVerified) {
    if (messageText === '10') {
      try {
        // 1. حذف رسالة المستخدم (الرقم 10) ورسالة الصورة
        await ctx.deleteMessage().catch(() => {});
        await ctx.deleteMessage(session.captchaMessageId).catch(() => {});
        
        session.isVerified = true;

        // 2. إرسال نص "تم التحقق بنجاح" كرسالة منفصلة أولاً
        await ctx.reply('✅ تم التحقق بنجاح!');

        // 3. إرسال رسالة الترحيب مع الزر الشفاف بالاسم المطلوب
        return ctx.reply(
          'مرحبا بك في اختبار التمويل اضغط على الزر في الاسفل لفتح الأختبار',
          Markup.inlineKeyboard([
            Markup.button.webApp('فتح الأختبار من هنا', 'https://unfortunately-lemon.vercel.app/')
          ])
        );
      } catch (error) {
        console.error("Error during verification flow:", error);
      }
    } else {
      return ctx.reply('❌ إجابة خاطئة، حاول مرة أخرى. كم ناتج 8 + 2؟');
    }
  }
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

const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// إعدادات المطور
const ADMIN_ID = 8582402572;
let leaderboard = [];
const userSessions = {};

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const sentMsg = await ctx.replyWithPhoto('https://od.lk/s/M18zMjc4MDA5NzJf/img_1778128950939.png', {
    caption: 'الرجاء حل الاختبار للتأكد من أنك لست حساباً وهمياً:\n\n**كم ناتج 8 + 2؟**'
  });

  userSessions[userId] = {
    captchaMessageId: sentMsg.message_id,
    isVerified: false,
    startTime: null // سيتم تعيينه عند فتح التطبيق
  };
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const messageText = ctx.message.text.trim();
  const session = userSessions[userId];

  // أوامر المطور
  if (userId === ADMIN_ID) {
    if (messageText === 'تصفير') {
      leaderboard = [];
      return ctx.reply('🗑 تم تصفير قائمة المتصدرين بنجاح.');
    }
    if (messageText.startsWith('اعلان ')) {
      const announcement = messageText.replace('اعلان ', '');
      return ctx.reply(`📢 تم استلام الإعلان:\n\n${announcement}\n\n(ملاحظة: لإرساله للكل يتطلب قاعدة بيانات للمستخدمين، حالياً سيظهر هنا فقط).`);
    }
  }

  // منطق التحقق
  if (session && !session.isVerified) {
    if (messageText === '10') {
      try {
        await ctx.deleteMessage().catch(() => {});
        await ctx.deleteMessage(session.captchaMessageId).catch(() => {});
        session.isVerified = true;
        session.startTime = Date.now(); // يبدأ حساب وقت "التواجد" من هنا

        await ctx.reply('✅ تم التحقق بنجاح!');
        return ctx.reply(
          'مرحبا بك في اختبار التمويل.\nاضغط على الزر لفتح الاختبار، وبعد إنهاء دقيقتين من الدراسة اضغط على "تأكيد الإنجاز" لتسجيل اسمك في المتصدرين.',
          Markup.inlineKeyboard([
            [Markup.button.webApp('فتح الأختبار من هنا', 'https://unfortunately-lemon.vercel.app/')],
            [Markup.button.callback('✅ تأكيد إنهاء الاختبار (2د+)', 'confirm_finish')],
            [
              Markup.button.callback('🏆 المتصدرين', 'show_leaderboard'),
              Markup.button.callback('⚙️ الحالة التقنية', 'show_status')
            ]
          ])
        );
      } catch (e) { console.error(e); }
    }
  }
});

// منطق تأكيد الإنهاء (بعد دقيقتين)
bot.action('confirm_finish', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];

  if (!session || !session.startTime) return ctx.answerCbQuery('يرجى البدء من جديد عبر /start');

  const timeSpentSeconds = (Date.now() - session.startTime) / 1000;
  const twoMinutes = 120;

  if (timeSpentSeconds >= twoMinutes) {
    const minutes = Math.floor(timeSpentSeconds / 60);
    // إضافة للمتصدرين (الأكثر صموداً/دراسة)
    if (!leaderboard.find(u => u.id === userId)) {
      leaderboard.push({ id: userId, name: ctx.from.first_name, time: minutes });
      leaderboard.sort((a, b) => b.time - a.time); // الترتيب من الأكثر وقتاً للأقل
    }
    return ctx.reply(`🎉 كفو! لقد استمررت في الدراسة لمدة ${minutes} دقيقة. تم إضافتك للمتصدرين.`);
  } else {
    const remaining = Math.ceil(twoMinutes - timeSpentSeconds);
    return ctx.answerCbQuery(`يجب عليك الاستمرار في الاختبار لمدة ${remaining} ثانية إضافية لتسجيل اسمك!`, { show_alert: true });
  }
});

// قائمة المتصدرين (عرض الأسماء والوقت بالدقائق)
bot.action('show_leaderboard', (ctx) => {
  if (leaderboard.length === 0) return ctx.answerCbQuery('القائمة فارغة!');
  let text = '🏆 متصدري الصمود في الاختبار (بالدقائق):\n\n';
  leaderboard.slice(0, 5).forEach((u, i) => {
    text += `${i + 1}. ${u.name} - ⏱ ${u.time} دقيقة\n`;
  });
  return ctx.reply(text);
});

// زر الحالة التقنية
bot.action('show_status', async (ctx) => {
  const ping = Date.now() - ctx.update.callback_query.message.date * 1000; // تقريبي
  return ctx.replyWithMarkdown(`💻 **الحالة:** متصل\n⚡ **Ping:** ${Math.abs(ping) % 1000}ms\n👑 **المطور:** [Sedo]`);
});

module.exports = async (req, res) => {
  if (req.method === 'POST') await bot.handleUpdate(req.body);
  res.status(200).send('OK');
};

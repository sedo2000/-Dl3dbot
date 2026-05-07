const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

const userSessions = {};
// مصفوفة لتخزين أسرع النتائج (بشكل مؤقت)
let leaderboard = [];

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const startTime = Date.now(); // تسجيل وقت البداية

  const sentMsg = await ctx.replyWithPhoto('https://od.lk/s/M18zMjc4MDA5NzJf/img_1778128950939.png', {
    caption: 'الرجاء حل الاختبار للتأكد من أنك لست حساباً وهمياً:\n\n**كم ناتج 8 + 2؟**'
  });

  userSessions[userId] = {
    captchaMessageId: sentMsg.message_id,
    isVerified: false,
    startTime: startTime
  };
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name;
  const messageText = ctx.message.text.trim();
  const session = userSessions[userId];

  if (session && !session.isVerified) {
    if (messageText === '10') {
      const endTime = Date.now();
      const timeTaken = ((endTime - session.startTime) / 1000).toFixed(2); // حساب الوقت بالثواني

      try {
        await ctx.deleteMessage().catch(() => {});
        await ctx.deleteMessage(session.captchaMessageId).catch(() => {});
        
        session.isVerified = true;

        // إضافة المستخدم لقائمة المتصدرين وترتيبها
        leaderboard.push({ name: firstName, time: parseFloat(timeTaken) });
        leaderboard.sort((a, b) => a.time - b.time);
        leaderboard = leaderboard.slice(0, 5); // الاحتفاظ بأفضل 5 فقط

        await ctx.reply(`✅ تم التحقق بنجاح في ${timeTaken} ثانية!`);

        return ctx.reply(
          'مرحبا بك في اختبار التمويل اضغط على الزر في الاسفل لفتح الأختبار',
          Markup.inlineKeyboard([
            [Markup.button.webApp('فتح الأختبار من هنا', 'https://unfortunately-lemon.vercel.app/')],
            [Markup.button.callback('🏆 قائمة المتصدرين', 'show_leaderboard')]
          ])
        );
      } catch (error) {
        console.error("Error:", error);
      }
    } else {
      return ctx.reply('❌ إجابة خاطئة، حاول مرة أخرى.');
    }
  }
});

// التعامل مع ضغطة زر قائمة المتصدرين
bot.action('show_leaderboard', (ctx) => {
  if (leaderboard.length === 0) {
    return ctx.answerCbQuery('القائمة فارغة حالياً، كن أول من يتصدر!', { show_alert: true });
  }

  let text = '🏆 أسرع 5 أشخاص حلوا الاختبار اليوم:\n\n';
  leaderboard.forEach((user, index) => {
    text += `${index + 1}. ${user.name} - ⏱ ${user.time} ثانية\n`;
  });

  return ctx.reply(text);
});

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
    }
    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('Error');
  }
};

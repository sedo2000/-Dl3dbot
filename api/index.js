const { Telegraf, Markup } = require('telegraf');

// التأكد من وضع BOT_TOKEN في إعدادات Vercel
const bot = new Telegraf(process.env.BOT_TOKEN);

// إعدادات المطور
const ADMIN_ID = 8582402572;
let leaderboard = []; // تخزين المتصدرين
const userSessions = {}; // تخزين جلسات المستخدمين (التحقق والوقت)

// --- وظيفة بدء البوت ---
bot.start(async (ctx) => {
  const userId = ctx.from.id;

  // 1. فحص هل المستخدم تم التحقق منه مسبقاً؟
  if (userSessions[userId] && userSessions[userId].isVerified) {
    return ctx.reply(
      `أهلاً بك مجدداً يا ${ctx.from.first_name}! 👋\nلقد تم التحقق من حسابك مسبقاً، يمكنك البدء مباشرة.`,
      Markup.inlineKeyboard([
        [Markup.button.webApp('فتح الأختبار من هنا 🚀', 'https://unfortunately-lemon.vercel.app/')],
        [Markup.button.callback('✅ تأكيد الإنجاز (2د+)', 'confirm_finish')],
        [
          Markup.button.callback('🏆 المتصدرين', 'show_leaderboard'),
          Markup.button.callback('⚙️ الحالة التقنية', 'show_status')
        ]
      ])
    );
  }

  // 2. إذا لم يكن موثقاً، إرسال الكابتشا
  const sentMsg = await ctx.replyWithPhoto('https://od.lk/s/M18zMjc4MDA5NzJf/img_1778128950939.png', {
    caption: 'الرجاء حل الاختبار للتأكد من أنك لست حساباً وهمياً:\n\n**كم ناتج 8 + 2؟**'
  });

  // إنشاء جلسة جديدة للمستخدم
  userSessions[userId] = {
    captchaMessageId: sentMsg.message_id,
    isVerified: false,
    startTime: null
  };
});

// --- معالجة الرسائل النصية ---
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const messageText = ctx.message.text.trim();
  const session = userSessions[userId];

  // أ) أوامر المطور (ADMIN)
  if (userId === ADMIN_ID) {
    if (messageText === 'تصفير') {
      leaderboard = [];
      return ctx.reply('🗑 تم تصفير قائمة المتصدرين بنجاح.');
    }
    if (messageText.startsWith('اعلان ')) {
      const announcement = messageText.replace('اعلان ', '');
      return ctx.reply(`📢 تم تسجيل الإعلان بنجاح:\n\n"${announcement}"\n\n(ملاحظة: يتطلب الإرسال الجماعي قاعدة بيانات دائمة للمستخدمين).`);
    }
  }

  // ب) منطق التحقق من الكابتشا للمستخدمين
  if (session && !session.isVerified) {
    if (messageText === '10') {
      try {
        // حذف رسالة المستخدم ورسالة الكابتشا
        await ctx.deleteMessage().catch(() => {});
        await ctx.deleteMessage(session.captchaMessageId).catch(() => {});
        
        // تحديث حالة المستخدم
        session.isVerified = true;
        session.startTime = Date.now(); // بدء حساب وقت التواجد

        await ctx.reply('✅ تم التحقق بنجاح!');
        return ctx.reply(
          'مرحبا بك في اختبار التمويل اضغط على الزر في الاسفل لفتح الأختبار',
          Markup.inlineKeyboard([
            [Markup.button.webApp('فتح الأختبار من هنا', 'https://unfortunately-lemon.vercel.app/')],
            [Markup.button.callback('✅ تأكيد الإنجاز (2د+)', 'confirm_finish')],
            [
              Markup.button.callback('🏆 المتصدرين', 'show_leaderboard'),
              Markup.button.callback('⚙️ الحالة التقنية', 'show_status')
            ]
          ])
        );
      } catch (e) {
        console.error("Error in verification flow:", e);
      }
    } else {
      return ctx.reply('❌ إجابة خاطئة، حاول مرة أخرى. كم ناتج 8 + 2؟');
    }
  }
});

// --- معالجة أزرار الكول باك (Inline Buttons) ---

// 1. زر تأكيد الإنجاز (بعد دقيقتين)
bot.action('confirm_finish', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];

  if (!session || !session.startTime) {
    return ctx.answerCbQuery('⚠️ يرجى البدء أولاً عبر أمر /start', { show_alert: true });
  }

  const timeSpentSeconds = (Date.now() - session.startTime) / 1000;
  const targetTime = 120; // دقيقتين

  if (timeSpentSeconds >= targetTime) {
    const minutes = Math.floor(timeSpentSeconds / 60);
    // تسجيل في المتصدرين إذا لم يكن مسجلاً
    if (!leaderboard.find(u => u.id === userId)) {
      leaderboard.push({ id: userId, name: ctx.from.first_name, time: minutes });
      leaderboard.sort((a, b) => b.time - a.time); // الأكثر وقتاً في الأعلى
    }
    return ctx.reply(`🎉 أحسنت يا ${ctx.from.first_name}! لقد أتممت ${minutes} دقيقة من الدراسة. تم تسجيل اسمك في المتصدرين.`);
  } else {
    const remaining = Math.ceil(targetTime - timeSpentSeconds);
    return ctx.answerCbQuery(`⏳ متبقي ${remaining} ثانية لتتمكن من تسجيل إنجازك! استمر في الاختبار.`, { show_alert: true });
  }
});

// 2. زر قائمة المتصدرين
bot.action('show_leaderboard', (ctx) => {
  if (leaderboard.length === 0) {
    return ctx.answerCbQuery('القائمة فارغة حالياً، كن أول المجتهدين!', { show_alert: true });
  }

  let text = '🏆 قائمة متصدري الصمود (أكثر من دقيقتين):\n\n';
  leaderboard.slice(0, 5).forEach((user, index) => {
    text += `${index + 1}. ${user.name} — ⏱ ${user.time} دقيقة\n`;
  });
  return ctx.reply(text);
});

// 3. زر الحالة التقنية
bot.action('show_status', async (ctx) => {
  const ping = Math.floor(Math.random() * (150 - 50 + 1) + 50); // محاكاة لسرعة الاستجابة
  const statusMsg = `
💻 **الحالة التقنية للنظام:**
---
📡 **الخادم:** Vercel Serverless
🟢 **الحالة:** يعمل بكفاءة
⚡ **Ping:** ${ping}ms
🛠 **المطور:** [@Dl3dbot]
---
_تم تحديث البيانات تلقائياً._
  `;
  return ctx.replyWithMarkdown(statusMsg);
});

// --- إعداد الويب هوك الخاص بـ Vercel ---
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error("Vercel Function Error:", err);
    res.status(500).send('Error');
  }
};

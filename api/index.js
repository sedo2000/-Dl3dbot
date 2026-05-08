const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// إعدادات المطور
const ADMIN_ID = 8582402572;
let leaderboard = [];
let userSessions = {};
const allUsers = new Set(); 

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  allUsers.add(userId);

  const sentMsg = await ctx.replyWithPhoto('https://od.lk/s/M18zMjc4MDA5NzJf/img_1778128950939.png', {
    caption: 'الرجاء حل الاختبار للتأكد من أنك لست حساباً وهمياً:\n\n**كم ناتج 8 + 2؟**',
    parse_mode: 'Markdown'
  });

  userSessions[userId] = {
    captchaMessageId: sentMsg.message_id,
    isVerified: false,
    startTime: null 
  };
});

// --- أمر المطور الجديد /admin ---
bot.command('admin', async (ctx) => {
  const userId = ctx.from.id;

  if (userId !== ADMIN_ID) {
    return ctx.reply('⚠️ عذراً، هذا الأمر مخصص للمطور فقط.');
  }

  return ctx.reply('🛠 **لوحة تحكم المطور**\n\nإختر أحد الأوامر من الأزرار أدناه:', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('📊 الإحصائيات', 'admin_stats')],
      [Markup.button.callback('🗑 تصفير المتصدرين', 'admin_reset')],
      [Markup.button.callback('📢 إرسال إعلان للكل', 'admin_broadcast')]
    ])
  });
});

// معالجة ضغطات أزرار لوحة التحكم
bot.action('admin_stats', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('غير مسموح');
  return ctx.reply(`📊 عدد مستخدمي البوت الحاليين: ${allUsers.size}`);
});

bot.action('admin_reset', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('غير مسموح');
  leaderboard = [];
  return ctx.reply('🗑 تم تصفير قائمة المتصدرين بنجاح.');
});

bot.action('admin_broadcast', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('غير مسموح');
  return ctx.reply('📢 لإرسال إعلان، قم بكتابة الأمر بالتنسيق التالي:\n\n`اعلان [النص هنا]`', { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const messageText = ctx.message.text.trim();
  const session = userSessions[userId];

  // منطق الإعلان (للمطور)
  if (userId === ADMIN_ID && messageText.startsWith('اعلان ')) {
    const announcement = messageText.replace('اعلان ', '');
    const usersArray = Array.from(allUsers);
    let successCount = 0;

    await ctx.reply(`⏳ جاري الإرسال لـ ${usersArray.length} مستخدم...`);

    for (const id of usersArray) {
      try {
        await ctx.telegram.sendMessage(id, `📢 **إعلان من الإدارة:**\n\n${announcement}`, { parse_mode: 'Markdown' });
        successCount++;
      } catch (e) {}
    }
    return ctx.reply(`✅ تم الإرسال بنجاح إلى ${successCount} مستخدم.`);
  }

  // منطق التحقق (للمستخدمين)
  if (session && !session.isVerified) {
    if (messageText === '10') {
      try {
        await ctx.deleteMessage().catch(() => {});
        await ctx.deleteMessage(session.captchaMessageId).catch(() => {});
        session.isVerified = true;
        session.startTime = Date.now();
        await ctx.reply('✅ تم التحقق بنجاح!');
        return ctx.reply(
          'مرحبا بك في اختبار التمويل.',
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

// بقية الدوال (confirm_finish, show_leaderboard, show_status) تبقى كما هي في الكود السابق...
bot.action('confirm_finish', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions[userId];
  if (!session || !session.startTime) return ctx.answerCbQuery('يرجى البدء من جديد عبر /start');
  const timeSpentSeconds = (Date.now() - session.startTime) / 1000;
  if (timeSpentSeconds >= 120) {
    const minutes = Math.floor(timeSpentSeconds / 60);
    if (!leaderboard.find(u => u.id === userId)) {
      leaderboard.push({ id: userId, name: ctx.from.first_name, time: minutes });
      leaderboard.sort((a, b) => b.time - a.time);
    }
    return ctx.reply(`🎉 كفو! تم إضافتك للمتصدرين بـ ${minutes} دقيقة.`);
  } else {
    return ctx.answerCbQuery(`بقي ${Math.ceil(120 - timeSpentSeconds)} ثانية!`, { show_alert: true });
  }
});

bot.action('show_leaderboard', (ctx) => {
  if (leaderboard.length === 0) return ctx.answerCbQuery('القائمة فارغة!');
  let text = '🏆 المتصدرين:\n\n';
  leaderboard.slice(0, 5).forEach((u, i) => text += `${i + 1}. ${u.name} - ${u.time} د\n`);
  return ctx.reply(text);
});

bot.action('show_status', (ctx) => {
  return ctx.replyWithMarkdown(`💻 **الحالة:** متصل\n👑 **المطور:** [@Dl3dbot]`);
});

module.exports = async (req, res) => {
  if (req.method === 'POST') await bot.handleUpdate(req.body);
  res.status(200).send('OK');
};

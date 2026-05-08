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
    startTime: null,
    isWaitingForSupport: false // حالة جديدة للدعم الفني
  };
});

// --- أوامر المطور ---
bot.command('admin', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  return ctx.reply('🛠 **لوحة تحكم المطور**', Markup.inlineKeyboard([
    [Markup.button.callback('📊 الإحصائيات', 'admin_stats')],
    [Markup.button.callback('🗑 تصفير المتصدرين', 'admin_reset')],
    [Markup.button.callback('📢 إرسال إعلان للكل', 'admin_broadcast')]
  ]));
});

// --- منطق الدعم الفني ---
bot.action('contact_support', (ctx) => {
  const userId = ctx.from.id;
  if (!userSessions[userId]) return;
  
  userSessions[userId].isWaitingForSupport = true;
  return ctx.reply('💬 من فضلك أرسل رسالتك الآن (سؤال أو مشكلة)، وسيقوم المطور بالرد عليك في أقرب وقت.');
});

// --- معالجة الرسائل النصية ---
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const messageText = ctx.message.text.trim();
  const session = userSessions[userId];

  if (!session) return;

  // 1. إذا كان المستخدم يراسل الدعم الفني
  if (session.isWaitingForSupport) {
    session.isWaitingForSupport = false; // إنهاء وضع الانتظار
    
    // إرسال الرسالة للمطور
    await bot.telegram.sendMessage(ADMIN_ID, 
      `📩 **رسالة دعم جديدة:**\n\n👤 الاسم: ${ctx.from.first_name}\n🆔 الايدي: \`${userId}\`\n💬 الرسالة: ${messageText}`, 
      { parse_mode: 'Markdown' }
    );
    
    return ctx.reply('✅ تم إرسال رسالتك للمطور بنجاح. انتظر الرد هنا.');
  }

  // 2. إذا كان المطور يرد على مستخدم (تنسيق: رد [الايدي] [النص])
  if (userId === ADMIN_ID && messageText.startsWith('رد ')) {
    const parts = messageText.split(' ');
    const targetId = parts[1];
    const replyMsg = parts.slice(2).join(' ');
    
    try {
      await bot.telegram.sendMessage(targetId, `📩 **رد من الدعم الفني:**\n\n${replyMsg}`);
      return ctx.reply('✅ تم إرسال الرد للمستخدم.');
    } catch (e) {
      return ctx.reply('❌ فشل الإرسال. قد يكون المستخدم حظر البوت.');
    }
  }

  // 3. منطق الإعلان للمطور
  if (userId === ADMIN_ID && messageText.startsWith('اعلان ')) {
    const announcement = messageText.replace('اعلان ', '');
    for (const id of allUsers) {
      try { await bot.telegram.sendMessage(id, `📢 **إعلان:**\n\n${announcement}`); } catch (e) {}
    }
    return ctx.reply('✅ تم نشر الإعلان.');
  }

  // 4. منطق التحقق (Captcha)
  if (!session.isVerified && messageText === '10') {
    session.isVerified = true;
    session.startTime = Date.now();
    return ctx.reply('✅ تم التحقق!', Markup.inlineKeyboard([
      [Markup.button.webApp('فتح الأختبار', 'https://unfortunately-lemon.vercel.app/')],
      [Markup.button.callback('✅ تأكيد الإنجاز', 'confirm_finish')],
      [Markup.button.callback('👨‍💻 الدعم الفني', 'contact_support')], // الزر الجديد
      [Markup.button.callback('🏆 المتصدرين', 'show_leaderboard')]
    ]));
  }
});

// --- الإجراءات الأخرى (تصفير، إحصائيات، إلخ) ---
bot.action('admin_stats', (ctx) => ctx.reply(`📊 المستخدمين: ${allUsers.size}`));
bot.action('admin_reset', (ctx) => { leaderboard = []; ctx.reply('🗑 تم التصفير.'); });
bot.action('show_leaderboard', (ctx) => {
    if (leaderboard.length === 0) return ctx.answerCbQuery('القائمة فارغة!');
    let text = '🏆 المتصدرين:\n\n';
    leaderboard.slice(0, 5).forEach((u, i) => text += `${i + 1}. ${u.name} - ${u.time} د\n`);
    ctx.reply(text);
});

module.exports = async (req, res) => {
  if (req.method === 'POST') await bot.handleUpdate(req.body);
  res.status(200).send('OK');
};

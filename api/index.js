const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// إعدادات المطور
const ADMIN_ID = 8582402572;
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
    isWaitingForSupport: false 
  };
});

// --- لوحة تحكم المطور /admin ---
bot.command('admin', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  return ctx.reply('🛠 **لوحة تحكم المطور**', Markup.inlineKeyboard([
    [Markup.button.callback('📊 الإحصائيات', 'admin_stats')],
    [Markup.button.callback('📢 إرسال إعلان للكل', 'admin_broadcast')]
  ]));
});

// --- منطق الدعم الفني ---
bot.action('contact_support', (ctx) => {
  const userId = ctx.from.id;
  if (!userSessions[userId]) return;
  userSessions[userId].isWaitingForSupport = true;
  return ctx.reply('💬 من فضلك أرسل رسالتك الآن، وسيقوم المطور بالرد عليك في أقرب وقت.');
});

// --- معالجة الرسائل النصية ---
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const messageText = ctx.message.text.trim();
  const session = userSessions[userId];

  if (!session) return;

  // 1. إذا كان المستخدم يراسل الدعم الفني
  if (session.isWaitingForSupport) {
    session.isWaitingForSupport = false;
    await bot.telegram.sendMessage(ADMIN_ID, 
      `📩 **رسالة دعم جديدة:**\n\n👤 الاسم: ${ctx.from.first_name}\n🆔 الايدي: \`${userId}\`\n💬 الرسالة: ${messageText}`, 
      { parse_mode: 'Markdown' }
    );
    return ctx.reply('✅ تم إرسال رسالتك للمطور بنجاح.');
  }

  // 2. إذا كان المطور يرد على مستخدم (تنسيق: رد [الايدي] [النص])
  if (userId === ADMIN_ID && messageText.startsWith('رد ')) {
    const parts = messageText.split(' ');
    const targetId = parts[1];
    const replyMsg = parts.slice(2).join(' ');
    try {
      await bot.telegram.sendMessage(targetId, `📩 **رد من الإدارة:**\n\n${replyMsg}`);
      return ctx.reply('✅ تم إرسال الرد.');
    } catch (e) {
      return ctx.reply('❌ فشل الإرسال.');
    }
  }

  // 3. منطق الإعلان
  if (userId === ADMIN_ID && messageText.startsWith('اعلان ')) {
    const announcement = messageText.replace('اعلان ', '');
    let success = 0;
    for (const id of allUsers) {
      try { 
        await bot.telegram.sendMessage(id, `📢 **إعلان هام:**\n\n${announcement}`); 
        success++;
      } catch (e) {}
    }
    return ctx.reply(`✅ تم الإرسال لـ ${success} مستخدم.`);
  }

  // 4. منطق التحقق (Captcha)
  if (!session.isVerified && messageText === '10') {
    session.isVerified = true;
    return ctx.reply('✅ تم التحقق بنجاح! يمكنك الآن الدخول للاختبار أو التواصل مع الدعم.', Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 فتح الأختبار الآن', 'https://unfortunately-lemon.vercel.app/')],
      [Markup.button.callback('👨‍💻 الدعم الفني', 'contact_support')],
      [Markup.button.callback('⚙️ الحالة التقنية', 'show_status')]
    ]));
  }
});

// --- الأزرار الأخرى ---
bot.action('admin_stats', (ctx) => ctx.reply(`📊 عدد المستخدمين الكلي: ${allUsers.size}`));

bot.action('show_status', (ctx) => {
  return ctx.replyWithMarkdown(`💻 **الحالة:** متصل وبأفضل أداء\n👑 **المطور:** [@Dl3dbot]`);
});

module.exports = async (req, res) => {
  if (req.method === 'POST') await bot.handleUpdate(req.body);
  res.status(200).send('OK');
};

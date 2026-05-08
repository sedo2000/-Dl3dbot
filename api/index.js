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
    isVerified: false,
    isWaitingForSupport: false,
    isWaitingForAdminReply: false, // حالة للمطور عند الرد
    replyToUserId: null // لحفظ ايدي المستخدم الذي يرد عليه المطور
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

// --- منطق الدعم الفني للمستخدم ---
bot.action('contact_support', (ctx) => {
  const userId = ctx.from.id;
  if (!userSessions[userId]) return;
  userSessions[userId].isWaitingForSupport = true;
  return ctx.reply('💬 من فضلك أرسل رسالتك الآن، وسيقوم المطور بالرد عليك.');
});

// --- منطق ضغط المطور على زر "الرد على الرسالة" ---
bot.action(/^reply_to_(.+)$/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('غير مسموح');
  
  const targetUserId = ctx.match[1]; // استخراج ايدي المستخدم من بيانات الزر
  
  // تهيئة جلسة المطور للرد
  if (!userSessions[ADMIN_ID]) userSessions[ADMIN_ID] = {};
  userSessions[ADMIN_ID].isWaitingForAdminReply = true;
  userSessions[ADMIN_ID].replyToUserId = targetUserId;

  return ctx.reply(`✍️ حسناً، أرسل الآن رسالة الرد التي تريد إرسالها للمستخدم (ID: ${targetUserId}):`);
});

// --- معالجة الرسائل النصية ---
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const messageText = ctx.message.text.trim();
  
  // تأكد من وجود جلسة
  if (!userSessions[userId]) userSessions[userId] = {};
  const session = userSessions[userId];

  // 1. المطور يقوم بالرد على رسالة دعم (باستخدام الزر)
  if (userId === ADMIN_ID && session.isWaitingForAdminReply) {
    const targetId = session.replyToUserId;
    try {
      await bot.telegram.sendMessage(targetId, `📩 **رد من الإدارة:**\n\n${messageText}`);
      session.isWaitingForAdminReply = false;
      session.replyToUserId = null;
      return ctx.reply('✅ تم إرسال ردك للمستخدم بنجاح.');
    } catch (e) {
      session.isWaitingForAdminReply = false;
      return ctx.reply('❌ فشل الإرسال، قد يكون المستخدم حظر البوت.');
    }
  }

  // 2. المستخدم يراسل الدعم الفني
  if (session.isWaitingForSupport) {
    session.isWaitingForSupport = false;
    
    // إرسال الرسالة للمطور مع زر "الرد"
    await bot.telegram.sendMessage(ADMIN_ID, 
      `📩 **رسالة دعم جديدة:**\n\n👤 الاسم: ${ctx.from.first_name}\n🆔 الايدي: \`${userId}\`\n💬 الرسالة: ${messageText}`, 
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('↩️ الرد على الرسالة', `reply_to_${userId}`)]
        ])
      }
    );
    return ctx.reply('✅ تم إرسال رسالتك للمطور.');
  }

  // 3. منطق الإعلان للمطور
  if (userId === ADMIN_ID && messageText.startsWith('اعلان ')) {
    const announcement = messageText.replace('اعلان ', '');
    for (const id of allUsers) {
      try { await bot.telegram.sendMessage(id, `📢 **إعلان:**\n\n${announcement}`); } catch (e) {}
    }
    return ctx.reply('✅ تم النشر.');
  }

  // 4. منطق التحقق (Captcha)
  if (!session.isVerified && messageText === '10') {
    session.isVerified = true;
    return ctx.reply('✅ تم التحقق بنجاح!', Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 فتح الأختبار الآن', 'https://unfortunately-lemon.vercel.app/')],
      [Markup.button.callback('👨‍💻 الدعم الفني', 'contact_support')],
      [Markup.button.callback('⚙️ الحالة التقنية', 'show_status')]
    ]));
  }
});

// --- الأزرار المساعدة ---
bot.action('admin_stats', (ctx) => ctx.reply(`📊 عدد المستخدمين: ${allUsers.size}`));
bot.action('show_status', (ctx) => ctx.replyWithMarkdown(`💻 **الحالة:** متصل\n👑 **المطور:** [@Dl3dbot]`));

module.exports = async (req, res) => {
  if (req.method === 'POST') await bot.handleUpdate(req.body);
  res.status(200).send('OK');
};

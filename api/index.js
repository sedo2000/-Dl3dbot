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
    isWaitingForAdminReply: false,
    replyToUserId: null 
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

// --- مركز الدعم الفني (الردود التلقائية + المراسلة) ---
bot.action('contact_support', (ctx) => {
  return ctx.editMessageText('👨‍💻 **مركز الدعم الفني**\n\nمن فضلك اختر نوع الاستفسار للحصول على إجابة فورية، أو اختر مراسلة الإدارة:', 
    Markup.inlineKeyboard([
      [Markup.button.callback('❓ مشكلة في فتح الرابط', 'support_link_issue')],
      [Markup.button.callback('📜 تعليمات الاختبار', 'support_rules')],
      [Markup.button.callback('💬 مراسلة الإدارة مباشرة', 'contact_admin_direct')],
      [Markup.button.callback('⬅️ رجوع للقائمة', 'back_to_main')]
    ])
  );
});

bot.action('support_link_issue', (ctx) => {
  return ctx.editMessageText('💡 **حل مشكلة الرابط:**\n\n1. تأكد من تحديث تطبيق التليجرام لآخر إصدار.\n2. جرب فتح الرابط من متصفح خارجي (مثل Chrome).\n3. إذا كنت تستخدم VPN، حاول إيقافه.', 
    Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'contact_support')]])
  );
});

bot.action('support_rules', (ctx) => {
  return ctx.editMessageText('📜 **تعليمات الاختبار:**\n\n- يجب الإجابة على جميع الأسئلة بدقة.\n- لا يسمح باستخدام وسائل مساعدة خارجية.\n- في حال واجهت خطأ تقني، التقط صورة للشاشة وأرسلها للدعم.', 
    Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'contact_support')]])
  );
});

bot.action('contact_admin_direct', (ctx) => {
  const userId = ctx.from.id;
  if (!userSessions[userId]) userSessions[userId] = {};
  userSessions[userId].isWaitingForSupport = true;
  return ctx.reply('💬 حسناً، أرسل رسالتك الآن (نص فقط)، وسيقوم المطور بالرد عليك في أقرب وقت.');
});

// --- العودة للقائمة الرئيسية بعد التحقق ---
bot.action('back_to_main', (ctx) => {
  return ctx.editMessageText('✅ القائمة الرئيسية:', Markup.inlineKeyboard([
    [Markup.button.webApp('🚀 فتح الأختبار الآن', 'https://unfortunately-lemon.vercel.app/')],
    [Markup.button.callback('👨‍💻 الدعم الفني', 'contact_support')],
    [Markup.button.callback('⚙️ الحالة التقنية', 'show_status')]
  ]));
});

// --- منطق رد المطور السريع عبر الزر ---
bot.action(/^reply_to_(.+)$/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('غير مسموح');
  const targetUserId = ctx.match[1];
  if (!userSessions[ADMIN_ID]) userSessions[ADMIN_ID] = {};
  userSessions[ADMIN_ID].isWaitingForAdminReply = true;
  userSessions[ADMIN_ID].replyToUserId = targetUserId;
  return ctx.reply(`✍️ أرسل الآن ردك للمستخدم (ID: ${targetUserId}):`);
});

// --- معالجة الرسائل النصية ---
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const messageText = ctx.message.text.trim();
  if (!userSessions[userId]) userSessions[userId] = {};
  const session = userSessions[userId];

  // 1. المطور يرد على مستخدم
  if (userId === ADMIN_ID && session.isWaitingForAdminReply) {
    const targetId = session.replyToUserId;
    try {
      await bot.telegram.sendMessage(targetId, `📩 **رد من الإدارة:**\n\n${messageText}`);
      session.isWaitingForAdminReply = false;
      return ctx.reply('✅ تم إرسال الرد بنجاح.');
    } catch (e) {
      return ctx.reply('❌ فشل الإرسال.');
    }
  }

  // 2. المستخدم يراسل الدعم
  if (session.isWaitingForSupport) {
    session.isWaitingForSupport = false;
    await bot.telegram.sendMessage(ADMIN_ID, 
      `📩 **رسالة دعم جديدة:**\n\n👤 الاسم: ${ctx.from.first_name}\n🆔 الايدي: \`${userId}\`\n💬 الرسالة: ${messageText}`, 
      Markup.inlineKeyboard([[Markup.button.callback('↩️ الرد على الرسالة', `reply_to_${userId}`)]])
    );
    return ctx.reply('✅ تم إرسال رسالتك للمطور.');
  }

  // 3. الإعلان
  if (userId === ADMIN_ID && messageText.startsWith('اعلان ')) {
    const announcement = messageText.replace('اعلان ', '');
    for (const id of allUsers) {
      try { await bot.telegram.sendMessage(id, `📢 **إعلان:**\n\n${announcement}`); } catch (e) {}
    }
    return ctx.reply('✅ تم النشر.');
  }

  // 4. التحقق
  if (!session.isVerified && messageText === '10') {
    session.isVerified = true;
    return ctx.reply('✅ تم التحقق بنجاح!', Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 فتح الأختبار الآن', 'https://unfortunately-lemon.vercel.app/')],
      [Markup.button.callback('👨‍💻 الدعم الفني', 'contact_support')],
      [Markup.button.callback('⚙️ الحالة التقنية', 'show_status')]
    ]));
  }
});

// --- وظائف إضافية ---
bot.action('admin_stats', (ctx) => ctx.reply(`📊 عدد المستخدمين: ${allUsers.size}`));
bot.action('show_status', (ctx) => ctx.replyWithMarkdown(`💻 **الحالة:** متصل\n👑 **المطور:** [@Dl3dbot]`));

module.exports = async (req, res) => {
  if (req.method === 'POST') await bot.handleUpdate(req.body);
  res.status(200).send('OK');
};

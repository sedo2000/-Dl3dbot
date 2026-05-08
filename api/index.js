const { Telegraf, Markup } = require('telegraf');
const crypto = require('crypto');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- إعدادات البيانات ---
const ADMIN_ID = 8582402572;
let userSessions = {};
const allUsers = new Set(); 
const whispers = new Map(); // مخزن الهمسات

// --- 1. نظام الهمسة المطور (Inline Mode) ---
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query.trim();
  
  // طريقة الاستخدام تظهر كـ Inline عندما تكون الكتابة فارغة أو غير مكتملة
  if (!query || !query.includes('@')) {
    return await ctx.answerInlineQuery([], {
      switch_pm_text: 'طريقة الاستخدام: الرسالة @اليوزر',
      switch_pm_parameter: 'help'
    });
  }

  const mentionMatch = query.match(/(.*)@(\w+)$/);
  
  if (mentionMatch) {
    const messageContent = mentionMatch[1].trim();
    const targetUser = mentionMatch[2].toLowerCase();
    const whisperId = crypto.randomBytes(8).toString('hex');

    // حفظ بيانات الهمسة مع إضافة ايدي المرسل
    whispers.set(whisperId, {
      content: messageContent,
      target: targetUser,
      senderName: ctx.from.first_name,
      senderId: ctx.from.id.toString() // حفظ ايدي المرسل للتحقق لاحقاً
    });

    const results = [{
      type: 'article',
      id: whisperId,
      title: `📧 إرسال همسة سرية لـ @${targetUser}`,
      description: `المحتوى: ${messageContent}`,
      input_message_content: {
        message_text: `👤 **هـمـسـة سـريـة**\n\nإلى المستخدم: [ @${targetUser} ]\nالمرسل: ${ctx.from.first_name}\n\n🔐 لا يمكن قراءتها إلا من قبل المرسل والمستلم فقط.`,
        parse_mode: 'Markdown'
      },
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔓 فتح الهمسة', `show_whisper_${whisperId}`)]
      ])
    }];
    return await ctx.answerInlineQuery(results, { cache_time: 0 });
  }
});

// فك تشفير الهمسة (للمرسل والمستقبل)
bot.action(/^show_whisper_(.+)$/, async (ctx) => {
  const whisperId = ctx.match[1];
  const whisper = whispers.get(whisperId);
  if (!whisper) return ctx.answerCbQuery('⚠️ الهمسة منتهية الصلاحية.', { show_alert: true });

  const currentUser = ctx.from.username ? ctx.from.username.toLowerCase() : null;
  const currentId = ctx.from.id.toString();

  // التحقق: إذا كان الشخص هو المستهدف (يوزر أو ايدي) أو هو المرسل نفسه
  if (currentUser === whisper.target || currentId === whisper.target || currentId === whisper.senderId) {
    return ctx.answerCbQuery(`📖 الهمسة تقول:\n\n${whisper.content}`, { show_alert: true });
  } else {
    // النص الجديد حسب طلبك
    return ctx.answerCbQuery('وخر الهمسة مو الك 🫪', { show_alert: true });
  }
});

// --- 2. بداية البوت والتحقق ---
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  allUsers.add(userId);
  userSessions[userId] = { isVerified: false, isWaitingForSupport: false };

  await ctx.replyWithPhoto('https://od.lk/s/M18zMjc4MDA5NzJf/img_1778128950939.png', {
    caption: '🔒 **نظام حماية البوت**\n\nالرجاء حل الاختبار للتأكد من هويتك:\n**كم ناتج 8 + 2؟**',
    parse_mode: 'Markdown'
  });
});

// --- 3. لوحة تحكم المطور /admin ---
bot.command('admin', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  return ctx.reply('🛠 **لوحة تحكم المطور**', Markup.inlineKeyboard([
    [Markup.button.callback('📊 الإحصائيات', 'admin_stats')],
    [Markup.button.callback('📢 إعلان شامل', 'admin_broadcast')]
  ]));
});

// --- 4. مركز الدعم الفني ---
bot.action('contact_support', (ctx) => {
  return ctx.editMessageText('👨‍💻 **مركز الدعم الذكي**\nاختر نوع الاستفسار:', 
    Markup.inlineKeyboard([
      [Markup.button.callback('❓ مشكلة في الرابط', 'link_issue')],
      [Markup.button.callback('💬 مراسلة المطور', 'direct_contact')],
      [Markup.button.callback('⬅️ رجوع', 'back_main')]
    ])
  );
});

// [ ... باقي الأكواد الخاصة بالدعم والتحقق كما هي في النسخة السابقة ... ]

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text.trim();
  const session = userSessions[userId] || {};

  if (userId === ADMIN_ID && session.isWaitingForAdminReply) {
    try {
      await bot.telegram.sendMessage(session.replyToUserId, `📩 **رد من الإدارة:**\n\n${text}`);
      session.isWaitingForAdminReply = false;
      return ctx.reply('✅ تم إرسال الرد.');
    } catch (e) { return ctx.reply('❌ فشل الإرسال.'); }
  }

  if (session.isWaitingForSupport) {
    session.isWaitingForSupport = false;
    await bot.telegram.sendMessage(ADMIN_ID, `📩 **رسالة دعم:**\n👤 ${ctx.from.first_name}\n🆔 \`${userId}\`\n💬 ${text}`,
      Markup.inlineKeyboard([[Markup.button.callback('↩️ رد على المستخدم', `reply_to_${userId}`)]]));
    return ctx.reply('✅ وصلت رسالتك للمطور.');
  }

  if (userId === ADMIN_ID && text.startsWith('اعلان ')) {
    const msg = text.replace('اعلان ', '');
    allUsers.forEach(id => bot.telegram.sendMessage(id, `📢 **تنبيه:**\n\n${msg}`).catch(()=>{}));
    return ctx.reply('✅ تم النشر.');
  }

  if (!session.isVerified && text === '10') {
    session.isVerified = true;
    return ctx.reply('✅ تم التحقق بنجاح!', Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 فتح الأختبار', 'https://unfortunately-lemon.vercel.app/')],
      [Markup.button.callback('👨‍💻 الدعم الفني', 'contact_support')],
      [Markup.button.callback('⚙️ الحالة', 'show_status')]
    ]));
  }
});

bot.action(/^reply_to_(.+)$/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const target = ctx.match[1];
  userSessions[ADMIN_ID] = { isWaitingForAdminReply: true, replyToUserId: target };
  return ctx.reply(`✍️ أرسل ردك لـ (ID: ${target}):`);
});

bot.action('admin_stats', (ctx) => ctx.reply(`📊 المستخدمين: ${allUsers.size}`));
bot.action('back_main', (ctx) => ctx.editMessageText('✅ القائمة الرئيسية:', Markup.inlineKeyboard([
  [Markup.button.webApp('🚀 فتح الأختبار', 'https://unfortunately-lemon.vercel.app/')],
  [Markup.button.callback('👨‍💻 الدعم الفني', 'contact_support')]
])));
bot.action('show_status', (ctx) => ctx.reply('💻 الحالة: متصل\n👑 المطور: @Dl3dbot'));

module.exports = async (req, res) => {
  if (req.method === 'POST') await bot.handleUpdate(req.body);
  res.status(200).send('OK');
};

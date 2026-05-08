const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- إعدادات البيانات ---
const ADMIN_ID = 8582402572;
let userSessions = {};
const allUsers = new Set(); 

// --- 1. نظام الهمسة (Inline Mode) مع تشفير البيانات ---
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query.trim();
  
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
    const senderId = ctx.from.id.toString();
    const encodedContent = Buffer.from(messageContent).toString('base64');
    const callbackData = `ws:${targetUser}:${senderId}:${encodedContent}`;

    if (callbackData.length > 64) {
      return await ctx.answerInlineQuery([{
        type: 'article', id: 'err', title: '❌ النص طويل جداً',
        input_message_content: { message_text: '⚠️ فشل إرسال الهمسة لأن النص طويل.' }
      }]);
    }

    const results = [{
      type: 'article',
      id: Math.random().toString(36).substring(7),
      title: `📧 إرسال همسة لـ @${targetUser}`,
      input_message_content: {
        message_text: `👤 **هـمـسـة سـريـة**\n\nإلى: [ @${targetUser} ]\nالمرسل: ${ctx.from.first_name}\n\n🔐 لا يراها إلا المرسل والمستلم فقط.`,
        parse_mode: 'Markdown'
      },
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('🔓 فتح الهمسة', callbackData),
          Markup.button.switchToCurrentChatInlineQuery('اهمس 💬', '')
        ]
      ])
    }];
    return await ctx.answerInlineQuery(results, { cache_time: 0 });
  }
});

// معالجة فتح الهمسة
bot.action(/^ws:(.+):(.+):(.+)$/, async (ctx) => {
  const [targetUser, senderId, encodedContent] = [ctx.match[1], ctx.match[2], ctx.match[3]];
  const content = Buffer.from(encodedContent, 'base64').toString('utf-8');
  const currentUser = ctx.from.username ? ctx.from.username.toLowerCase() : null;
  const currentId = ctx.from.id.toString();

  if (currentUser === targetUser || currentId === targetUser || currentId === senderId) {
    return ctx.answerCbQuery(`📖 الهمسة تقول:\n\n${content}`, { show_alert: true });
  } else {
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

// --- 3. لوحة تحكم المطور والتحكم بالإعلانات ---
bot.command('admin', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  return ctx.reply('🛠 **لوحة تحكم المطور**\n\nللإعلان أرسل: `اعلان` متبوعاً بنصك.', Markup.inlineKeyboard([
    [Markup.button.callback('📊 الإحصائيات', 'admin_stats')]
  ]));
});

bot.action('admin_stats', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.reply(`📊 عدد المستخدمين النشطين: ${allUsers.size}`);
});

// --- 4. مركز الدعم الفني المطور ---
bot.action('contact_support', (ctx) => {
  return ctx.editMessageText('👨‍💻 **مركز الدعم الفني**\nاختر ما يناسبك:', 
    Markup.inlineKeyboard([
      [Markup.button.callback('❓ مشكلة في الرابط', 'link_issue')],
      [Markup.button.callback('💬 مراسلة المطور', 'direct_contact')],
      [Markup.button.callback('⬅️ رجوع', 'back_main')]
    ])
  );
});

bot.action('link_issue', (ctx) => {
  return ctx.editMessageText('💡 **حلول سريعة:**\n1. حدث التليجرام.\n2. استخدم Chrome.\n3. أوقف الـ VPN.', 
    Markup.inlineKeyboard([[Markup.button.callback('⬅️ رجوع', 'contact_support')]]));
});

bot.action('direct_contact', (ctx) => {
  const userId = ctx.from.id;
  if (!userSessions[userId]) userSessions[userId] = {};
  userSessions[userId].isWaitingForSupport = true;
  return ctx.reply('💬 أرسل استفسارك الآن (نصياً) وسيقوم المطور بالرد عليك.');
});

bot.action('back_main', (ctx) => {
  return ctx.editMessageText('✅ القائمة الرئيسية:', Markup.inlineKeyboard([
    [Markup.button.webApp('🚀 فتح الأختبار', 'https://unfortunately-lemon.vercel.app/')],
    [Markup.button.callback('👨‍💻 الدعم الفني', 'contact_support')],
    [Markup.button.callback('⚙️ الحالة', 'show_status')]
  ]));
});

// --- 5. معالجة كافة الرسائل (التحقق، الإعلان، الدعم، رد المطور) ---
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text.trim();
  
  if (!userSessions[userId]) userSessions[userId] = { isVerified: false };
  const session = userSessions[userId];

  // أ. المطور يرد على مستخدم (بعد الضغط على زر رد)
  if (userId === ADMIN_ID && session.isWaitingForAdminReply) {
    try {
      await bot.telegram.sendMessage(session.replyToUserId, `📩 **رد من الإدارة:**\n\n${text}`);
      session.isWaitingForAdminReply = false;
      return ctx.reply('✅ تم إرسال ردك بنجاح.');
    } catch (e) { return ctx.reply('❌ فشل الإرسال (قد يكون المستخدم حظر البوت).'); }
  }

  // ب. المطور يرسل إعلان
  if (userId === ADMIN_ID && text.startsWith('اعلان ')) {
    const msg = text.replace('اعلان ', '');
    let count = 0;
    for (let id of allUsers) {
      try {
        await bot.telegram.sendMessage(id, `📢 **إعلان هام:**\n\n${msg}`);
        count++;
      } catch (e) {}
    }
    return ctx.reply(`✅ تم إرسال الإعلان إلى ${count} مستخدم.`);
  }

  // ج. مستخدم يراسل الدعم
  if (session.isWaitingForSupport) {
    session.isWaitingForSupport = false;
    await bot.telegram.sendMessage(ADMIN_ID, `📩 **رسالة دعم جديدة:**\n👤 ${ctx.from.first_name}\n🆔 \`${userId}\`\n💬 ${text}`,
      Markup.inlineKeyboard([[Markup.button.callback('↩️ الرد على الرسالة', `reply_to_${userId}`)]]));
    return ctx.reply('✅ وصلت رسالتك للمطور، انتظر الرد.');
  }

  // د. حل الـ Captcha
  if (!session.isVerified && text === '10') {
    session.isVerified = true;
    return ctx.reply('✅ تم التحقق بنجاح!', Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 فتح الأختبار', 'https://unfortunately-lemon.vercel.app/')],
      [Markup.button.callback('👨‍💻 الدعم الفني', 'contact_support')],
      [Markup.button.callback('⚙️ الحالة', 'show_status')]
    ]));
  }
});

// --- 6. رد المطور السريع (زر الرد) ---
bot.action(/^reply_to_(.+)$/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const target = ctx.match[1];
  userSessions[ADMIN_ID] = { isWaitingForAdminReply: true, replyToUserId: target };
  return ctx.reply(`✍️ أرسل ردك الآن للمستخدم صاحب الأيدي (${target}):`);
});

bot.action('show_status', (ctx) => ctx.reply('💻 الحالة: متصل وبأفضل أداء\n👑 المطور: @Dl3dbot'));

// --- تشغيل البوت على Vercel ---
module.exports = async (req, res) => {
  if (req.method === 'POST') await bot.handleUpdate(req.body);
  res.status(200).send('OK');
};

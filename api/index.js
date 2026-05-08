const { Telegraf, Markup } = require('telegraf');

// تأكد من وضع التوكن الخاص بك في بيئة العمل (Environment Variables)
const bot = new Telegraf(process.env.BOT_TOKEN);

// إعدادات المطور
const ADMIN_ID = 8582402572;
let userSessions = {};
const allUsers = new Set(); 

// ==========================================
// 1. نظام الهمسة (Inline Mode) - يعمل في أي مكان
// ==========================================
bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim();

    // إذا كانت الكتابة فارغة، أظهر طريقة الاستخدام
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

        // تشفير البيانات في الزر (Callback Data)
        const encodedContent = Buffer.from(messageContent).toString('base64');
        const callbackData = `ws:${targetUser}:${senderId}:${encodedContent}`;

        // حماية من تجاوز حجم البيانات (64 بايت كحد أقصى)
        if (callbackData.length > 64) {
            return await ctx.answerInlineQuery([{
                type: 'article', id: 'err', title: '❌ النص طويل جداً!',
                input_message_content: { message_text: '⚠️ فشل إرسال الهمسة لأن النص طويل.' }
            }]);
        }

        const results = [{
            type: 'article',
            id: 'whisper_' + Date.now(),
            title: `📧 إرسال همسة لـ @${targetUser}`,
            description: `المحتوى: ${messageContent}`,
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

// معالجة الضغط على "فتح الهمسة"
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

// ==========================================
// 2. أوامر البوت الأساسية (Start & Admin)
// ==========================================
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    allUsers.add(userId);
    userSessions[userId] = { isVerified: false, isWaitingForSupport: false };

    await ctx.replyWithPhoto('https://od.lk/s/M18zMjc4MDA5NzJf/img_1778128950939.png', {
        caption: '🔒 **نظام حماية البوت**\n\nالرجاء حل الاختبار للتأكد من هويتك:\n**كم ناتج 8 + 2؟**',
        parse_mode: 'Markdown'
    });
});

bot.command('admin', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    return ctx.reply('🛠 **لوحة تحكم المطور**\n\nللإعلان: أرسل كلمة (اعلان) وبعدها النص.\nمثال: `اعلان هلا بالشباب`');
});

// ==========================================
// 3. أزرار القائمة والدعم الفني
// ==========================================
bot.action('contact_support', (ctx) => {
    return ctx.editMessageText('👨‍💻 **مركز الدعم الفني**\nاختر نوع الاستفسار:', 
        Markup.inlineKeyboard([
            [Markup.button.callback('❓ مشكلة في الرابط', 'link_issue')],
            [Markup.button.callback('💬 مراسلة المطور', 'direct_contact')],
            [Markup.button.callback('⬅️ رجوع', 'back_main')]
        ])
    );
});

bot.action('direct_contact', (ctx) => {
    userSessions[ctx.from.id] = userSessions[ctx.from.id] || {};
    userSessions[ctx.from.id].isWaitingForSupport = true;
    return ctx.reply('💬 أرسل استفسارك الآن وسيرد المطور عليك.');
});

bot.action('back_main', (ctx) => {
    return ctx.editMessageText('✅ القائمة الرئيسية:', Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 فتح الأختبار', 'https://unfortunately-lemon.vercel.app/')],
        [Markup.button.callback('👨‍💻 الدعم الفني', 'contact_support')],
        [Markup.button.callback('⚙️ الحالة', 'show_status')]
    ]));
});

// ==========================================
// 4. معالجة الرسائل النصية الشاملة
// ==========================================
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    
    if (!userSessions[userId]) userSessions[userId] = { isVerified: false };
    const session = userSessions[userId];

    // رد المطور
    if (userId === ADMIN_ID && session.isWaitingForAdminReply) {
        try {
            await bot.telegram.sendMessage(session.replyToUserId, `📩 **رد من الإدارة:**\n\n${text}`);
            session.isWaitingForAdminReply = false;
            return ctx.reply('✅ تم إرسال ردك.');
        } catch (e) { return ctx.reply('❌ فشل الإرسال.'); }
    }

    // الإعلان
    if (userId === ADMIN_ID && text.startsWith('اعلان ')) {
        const msg = text.replace('اعلان ', '');
        allUsers.forEach(id => bot.telegram.sendMessage(id, `📢 **إعلان:**\n\n${msg}`).catch(()=>{}));
        return ctx.reply(`✅ جاري الإرسال لـ ${allUsers.size} مستخدم.`);
    }

    // رسالة الدعم
    if (session.isWaitingForSupport) {
        session.isWaitingForSupport = false;
        await bot.telegram.sendMessage(ADMIN_ID, `📩 **رسالة دعم:**\n👤 ${ctx.from.first_name}\n🆔 \`${userId}\`\n💬 ${text}`,
            Markup.inlineKeyboard([[Markup.button.callback('↩️ رد', `reply_to_${userId}`)]]));
        return ctx.reply('✅ تم إرسال رسالتك.');
    }

    // التحقق
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
    userSessions[ADMIN_ID] = { isWaitingForAdminReply: true, replyToUserId: ctx.match[1] };
    return ctx.reply(`✍️ أرسل ردك الآن للآيدي: ${ctx.match[1]}`);
});

bot.action('show_status', (ctx) => ctx.reply('💻 الحالة: متصل\n👑 المطور: @Dl3dbot'));

module.exports = async (req, res) => {
    if (req.method === 'POST') await bot.handleUpdate(req.body);
    res.status(200).send('OK');
};

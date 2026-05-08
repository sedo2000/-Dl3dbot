const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// إعدادات المطور
const ADMIN_ID = 8582402572;
let userSessions = {};
const allUsers = new Set(); 

// --- 1. نظام الهمسة (الحل النهائي لمشكلة الرسالة الفارغة) ---
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

        // تشفير النص داخل الزر (Base64) لضمان عدم ضياعه
        const encodedContent = Buffer.from(messageContent).toString('base64');
        
        // هيكل البيانات داخل الزر: ws:[المستلم]:[المرسل]:[النص المشفر]
        const callbackData = `ws:${targetUser}:${senderId}:${encodedContent}`;

        // تنبيه في حال كان النص طويلاً جداً (تليجرام يسمح بـ 64 حرفاً فقط للبيانات)
        if (callbackData.length > 64) {
            return await ctx.answerInlineQuery([{
                type: 'article', id: 'err', title: '❌ النص طويل جداً!',
                input_message_content: { message_text: '⚠️ النص طويل، حاول اختصاره ليعمل نظام التشفير.' }
            }]);
        }

        const results = [{
            type: 'article',
            id: 'whp_' + Math.random().toString(36).substr(2, 9),
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

// معالجة فتح الهمسة من البيانات المشفرة داخل الزر
bot.action(/^ws:(.+):(.+):(.+)$/, async (ctx) => {
    const targetUser = ctx.match[1];
    const senderId = ctx.match[2];
    const encodedContent = ctx.match[3];

    try {
        const content = Buffer.from(encodedContent, 'base64').toString('utf-8');
        const currentUser = ctx.from.username ? ctx.from.username.toLowerCase() : null;
        const currentId = ctx.from.id.toString();

        // السماح للمستلم أو المرسل فقط بالرؤية
        if (currentUser === targetUser || currentId === targetUser || currentId === senderId) {
            return ctx.answerCbQuery(`📖 الهمسة تقول:\n\n${content}`, { show_alert: true });
        } else {
            return ctx.answerCbQuery('وخر الهمسة مو الك 🫪', { show_alert: true });
        }
    } catch (e) {
        return ctx.answerCbQuery('⚠️ حدث خطأ في فك تشفير الهمسة.', { show_alert: true });
    }
});

// --- 2. الأوامر الأساسية والدعم الفني ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    allUsers.add(userId);
    userSessions[userId] = { isVerified: false, isWaitingForSupport: false };
    await ctx.replyWithPhoto('https://od.lk/s/M18zMjc4MDA5NzJf/img_1778128950939.png', {
        caption: '🔒 **نظام حماية البوت**\n\nالرجاء حل الاختبار:\n**كم ناتج 8 + 2؟**',
        parse_mode: 'Markdown'
    });
});

bot.action('contact_support', (ctx) => {
    return ctx.editMessageText('👨‍💻 **الدعم الفني**', Markup.inlineKeyboard([
        [Markup.button.callback('💬 مراسلة المطور', 'direct_contact')],
        [Markup.button.callback('⬅️ رجوع', 'back_main')]
    ]));
});

bot.action('direct_contact', (ctx) => {
    userSessions[ctx.from.id] = userSessions[ctx.from.id] || {};
    userSessions[ctx.from.id].isWaitingForSupport = true;
    return ctx.reply('💬 أرسل استفسارك الآن وسيصل للمطور.');
});

bot.action('back_main', (ctx) => {
    return ctx.editMessageText('✅ القائمة الرئيسية:', Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 فتح الأختبار', 'https://unfortunately-lemon.vercel.app/')],
        [Markup.button.callback('👨‍💻 الدعم الفني', 'contact_support')]
    ]));
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const session = userSessions[userId] || { isVerified: false };

    if (userId === ADMIN_ID && text.startsWith('اعلان ')) {
        const msg = text.replace('اعلان ', '');
        allUsers.forEach(id => bot.telegram.sendMessage(id, `📢 **إعلان:**\n\n${msg}`).catch(()=>{}));
        return ctx.reply('✅ تم البدء في نشر الإعلان.');
    }

    if (session.isWaitingForSupport) {
        session.isWaitingForSupport = false;
        await bot.telegram.sendMessage(ADMIN_ID, `📩 رسالة من: ${ctx.from.first_name}\nID: \`${userId}\`\nنص: ${text}`);
        return ctx.reply('✅ وصلت رسالتك.');
    }

    if (!session.isVerified && text === '10') {
        session.isVerified = true;
        return ctx.reply('✅ تم التحقق!', Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 فتح الأختبار', 'https://unfortunately-lemon.vercel.app/')],
            [Markup.button.callback('👨‍💻 الدعم الفني', 'contact_support')]
        ]));
    }
});

module.exports = async (req, res) => {
    if (req.method === 'POST') await bot.handleUpdate(req.body);
    res.status(200).send('OK');
};

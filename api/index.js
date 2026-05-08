const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// مخزن مؤقت لحالة التحقق
let userSessions = {};

// --- بداية البوت ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    userSessions[userId] = { isVerified: false };

    await ctx.replyWithPhoto('https://od.lk/s/M18zMjc4MDA5NzJf/img_1778128950939.png', {
        caption: '🔒 **نظام حماية البوت**\n\nالرجاء حل الاختبار للتأكد من هويتك:\n**كم ناتج 8 + 2؟**',
        parse_mode: 'Markdown'
    });
});

// --- معالجة الإجابة والتحقق ---
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    
    if (!userSessions[userId]) userSessions[userId] = { isVerified: false };

    // إذا لم يكن المستخدم موثقاً وأرسل الإجابة الصحيحة
    if (!userSessions[userId].isVerified && text === '10') {
        userSessions[userId].isVerified = true;
        return ctx.reply('✅ تم التحقق بنجاح! يمكنك الآن الدخول:', Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 فتح الأختبار', 'https://unfortunately-lemon.vercel.app/')]
        ]));
    }
});

// تشغيل البوت على Vercel
module.exports = async (req, res) => {
    if (req.method === 'POST') await bot.handleUpdate(req.body);
    res.status(200).send('OK');
};

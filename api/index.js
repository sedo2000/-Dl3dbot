const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// استدعاء المفاتيح من بيئة Vercel
const bot = new Telegraf(process.env.BOT_TOKEN);
const PEXELS_KEY = process.env.PEXELS_KEY;

// قائمة الإيموجيات المعتمدة للتفاعل التلقائي
const reactions = ['👍', '❤️', '🔥', '🥰', '👏', '😁', '🤔', '🎉', '🤩', '🙏', '👌', '💯', '🏆', '🫡', '😎'];

// جدول المرحلة الثالثة
const examDates = ['2026-05-10', '2026-05-12', '2026-05-14', '2026-05-17', '2026-05-19', '2026-05-21'];
const adviceQuotes = [
    "عوف اللعب هسة ومستقبلك أهم من كلشي",
    "شد حيلك يا بطل مابقى شي وتفرح بنجاحك",
    "الوقت يركض والندم ميفيد بعدين كوم اقرأ",
    "تعب شهر ولا قهر سنة كاملة شدها للسبع"
];

// --- دوال جلب الميديا من Pexels ---
const getPhoto = async (q) => {
    try {
        const r = await axios.get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=1`, { 
            headers: { Authorization: PEXELS_KEY } 
        });
        return r.data.photos[0]?.src.large || null;
    } catch (e) { return null; }
};

const getVideo = async (q) => {
    try {
        const r = await axios.get(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=1`, { 
            headers: { Authorization: PEXELS_KEY } 
        });
        return r.data.videos[0]?.video_files[0]?.link || null;
    } catch (e) { return null; }
};

// --- الأوامر والرسائل ---
bot.start((ctx) => {
    const firstName = ctx.from.first_name; //
    ctx.reply(`هلا بيك يا ${firstName} في بوت المتابعة 📚`, Markup.inlineKeyboard([
        [Markup.button.callback('📅 جدول الامتحانات', 'view_exams')],
        [Markup.button.webApp('🚀 فتح الاختبار', 'https://unfortunately-lemon.vercel.app/')]
    ]));
});

bot.on(['message', 'photo', 'video'], async (ctx) => {
    if (!ctx.message) return;

    // التفاعل التلقائي على الميديا والنصوص
    try {
        const emoji = reactions[Math.floor(Math.random() * reactions.length)];
        await ctx.telegram.setMessageReaction(ctx.chat.id, ctx.message.message_id, [{ type: 'emoji', emoji }]);
    } catch (e) {}

    if (ctx.message.text) {
        const text = ctx.message.text;
        const today = new Date().toISOString().split('T')[0];

        // طلب الميديا (صورة/فيديو + الكلمة)
        if (text.startsWith('صورة ')) {
            const img = await getPhoto(text.replace('صورة ', ''));
            return img ? ctx.replyWithPhoto(img) : ctx.reply('ما لكيت صورة.');
        }
        if (text.startsWith('فيديو ')) {
            const vid = await getVideo(text.replace('فيديو ', ''));
            return vid ? ctx.replyWithVideo(vid) : ctx.reply('ما لكيت فيديو.');
        }

        // نظام الرقابة (أيام الدراسة مابين الامتحانات)
        const isExamMonth = today.includes('2026-05');
        const isExamDay = examDates.includes(today);

        if (isExamMonth && !isExamDay) {
            if (/لعب|ببجي|نطلع|ضايج|فلم|ملل/i.test(text)) {
                return ctx.reply(adviceQuotes[Math.floor(Math.random() * adviceQuotes.length)]);
            }
        }
    }
});

bot.action('view_exams', (ctx) => {
    ctx.reply(`📅 جدول المرحلة الثالثة:\n\n10-05: تمويل دولي\n12-05: محاسبة تكاليف\n14-05: محاسبة مصرفية\n17-05: جدوى مالية\n19-05: أسواق المال\n21-05: بحوث عمليات`);
    ctx.answerCbQuery();
});

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error');
        }
    } else {
        res.status(200).send('Bot is running');
    }
};

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const PEXELS_API_KEY = 'S6FExqGAcxGCBY9dXFBeyiH2NTeh8AJZTWAqa9P0NDYTVhxX5xfK651m';

// قائمة التفاعلات بالإيموجي
const reactions = ['👍', '❤️', '🔥', '🥰', '👏', '😁', '🤔', '🎉', '🤩', '🙏', '👌', '💯', '⚡️', '🏆', '🗿', '🆒', '😎'];

// تواريخ الامتحانات والاقتباسات (المرحلة الثالثة)
const examDates = ['2026-05-10', '2026-05-12', '2026-05-14', '2026-05-17', '2026-05-19', '2026-05-21'];
const adviceQuotes = [
    "عوف اللعب هسة ومستقبلك أهم من كلشي",
    "شد حيلك يا بطل مابقى شي وتفرح بنجاحك",
    "الوقت يركض والندم ميفيد بعدين كوم اقرأ",
    "السبع ميضيع وقته بالسوالف التعبانة بموسم الامتحانات",
    "تعب شهر ولا قهر سنة كاملة شدها للسبع",
    "كوم من الموبايل وروح للكتاب محد يفيدك غير شهادتك"
];

// --- دالة جلب الصور من Pexels ---
async function getPexelsPhoto(query) {
    try {
        const res = await axios.get(`https://api.pexels.com/v1/search?query=${query}&per_page=1`, {
            headers: { Authorization: PEXELS_API_KEY }
        });
        return res.data.photos[0]?.src.large || null;
    } catch (e) { return null; }
}

// --- دالة جلب الفيديوهات من Pexels ---
async function getPexelsVideo(query) {
    try {
        const res = await axios.get(`https://api.pexels.com/videos/search?query=${query}&per_page=1`, {
            headers: { Authorization: PEXELS_API_KEY }
        });
        return res.data.videos[0]?.video_files[0]?.link || null;
    } catch (e) { return null; }
}

// --- الترحيب ---
bot.start((ctx) => {
    const welcome = `هلا بيك يا ${ctx.from.first_name} في بوت المتابعة الذكي 📚\n\nيمكنك طلب صور أو فيديوهات بكتابة:\n(صورة + الشيء) أو (فيديو + الشيء)`;
    ctx.reply(welcome, Markup.inlineKeyboard([
        [Markup.button.callback('📅 جدول الامتحانات', 'view_exams')],
        [Markup.button.webApp('🚀 فتح الاختبار', 'https://unfortunately-lemon.vercel.app/')]
    ]));
});

// --- معالجة الرسائل ---
bot.on(['message', 'photo', 'video'], async (ctx) => {
    if (!ctx.message) return;

    // 1. التفاعل التلقائي بالإيموجي
    try {
        const emoji = reactions[Math.floor(Math.random() * reactions.length)];
        await ctx.telegram.setMessageReaction(ctx.chat.id, ctx.message.message_id, [{ type: 'emoji', emoji }]);
    } catch (e) {}

    // 2. معالجة طلبات الصور والفيديو والرقابة
    if (ctx.message.text) {
        const text = ctx.message.text.toLowerCase();
        const today = new Date().toISOString().split('T')[0];

        // طلب صورة
        if (text.startsWith('صورة ')) {
            const query = text.replace('صورة ', '');
            const img = await getPexelsPhoto(query);
            return img ? ctx.replyWithPhoto(img, { caption: `📸 نتيجة البحث عن: ${query}` }) : ctx.reply('لم أجد صورة لهذا الطلب.');
        }

        // طلب فيديو
        if (text.startsWith('فيديو ')) {
            const query = text.replace('فيديو ', '');
            const vid = await getPexelsVideo(query);
            return vid ? ctx.replyWithVideo(vid, { caption: `🎥 نتيجة البحث عن: ${query}` }) : ctx.reply('لم أجد فيديو لهذا الطلب.');
        }

        // نظام الرقابة في أيام الدراسة
        if (today.includes('2026-05') && !examDates.includes(today)) {
            if (/لعب|ببجي|نطلع|ضايج|فلم/i.test(text)) {
                return ctx.reply(adviceQuotes[Math.floor(Math.random() * adviceQuotes.length)]);
            }
        }
    }
});

// --- عرض الجدول ---
bot.action('view_exams', (ctx) => {
    const schedule = `📅 **جدول المرحلة الثالثة:**\n\nالأحد 05-10: تمويل دولي\nالثلاثاء 05-12: محاسبة تكاليف\nالخميس 05-14: محاسبة مصرفية\nالأحد 05-17: جدوى مالية\nالثلاثاء 05-19: أسواق المال\nالخميس 05-21: بحوث عمليات`;
    ctx.reply(schedule);
    ctx.answerCbQuery();
});

module.exports = async (req, res) => {
    if (req.method === 'POST') await bot.handleUpdate(req.body);
    res.status(200).send('OK');
};

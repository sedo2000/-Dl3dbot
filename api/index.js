const { Telegraf, Markup } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

// قائمة التفاعلات (الإيموجيات) - تُستخدم فقط للتفاعل التلقائي على الرسالة
const reactions = ['👍', '🔥', '👏', '💯', '⚡️', '🏆', '🫡', '🗿', '🆒', '😎'];

// جدول الامتحانات (المرحلة الثالثة)
const examDates = [
    '2026-05-10', '2026-05-12', '2026-05-14', 
    '2026-05-17', '2026-05-19', '2026-05-21'
];

// اقتباسات عراقية حازمة للنصح (بدون إيموجيات)
const adviceQuotes = [
    "عوف اللعب هسة ومستقبلك أهم من كلشي",
    "شد حيلك يا بطل مابقى شي وتفرح بنجاحك",
    "الوقت يركض والندم ميفيد بعدين كوم اقرأ",
    "السبع ميضيع وقته بالسوالف التعبانة بموسم الامتحانات",
    "تعب شهر ولا قهر سنة كاملة شدها للسبع",
    "أهلكم ينتظرون منكم الفرحة لا تكسرون بخاطرهم بضياع الوقت",
    "كوم من الموبايل وروح للكتاب محد يفيدك غير شهادتك"
];

// كلمات تدل على تضييع الوقت
const timeWastingKeywords = /لعب|ببجي|لودو|فلم|نمت|ضايج|نطلع|طالع|ملل|مسلسل|تيك توك/i;

bot.on('message', async (ctx, next) => {
    if (!ctx.message || !ctx.message.text) return next();

    const text = ctx.message.text;
    const today = new Date().toISOString().split('T')[0];

    // 1. التفاعل التلقائي بالإيموجي (دائماً يعمل)
    try {
        const randomEmoji = reactions[Math.floor(Math.random() * reactions.length)];
        await ctx.telegram.setMessageReaction(ctx.chat.id, ctx.message.message_id, [
            { type: 'emoji', emoji: randomEmoji }
        ]);
    } catch (e) {}

    // 2. نظام التدقيق في أيام ما بين الامتحانات
    // نفحص إذا كان اليوم ليس يوم امتحان ولكنه ضمن فترة الامتحانات
    const isExamMonth = today.includes('2026-05');
    const isExamDay = examDates.includes(today);

    if (isExamMonth && !isExamDay) {
        if (timeWastingKeywords.test(text)) {
            const advice = adviceQuotes[Math.floor(Math.random() * adviceQuotes.length)];
            // الرد بنصيحة عراقية بدون إيموجي
            return ctx.reply(advice, { reply_to_message_id: ctx.message.message_id });
        }
    }

    return next();
});

// زر عرض الجدول (للتذكير)
bot.start((ctx) => {
    ctx.reply('📚 نظام المتابعة الذكي للمرحلة الثالثة', Markup.inlineKeyboard([
        [Markup.button.callback('📅 جدول الامتحانات', 'view_exams')]
    ]));
});

bot.action('view_exams', (ctx) => {
    const schedule = `
الأحد 2026-05-10: مادة تمويل دولي.
الثلاثاء 2026-05-12: مادة محاسبة تكاليف ك2.
الخميس 2026-05-14: مادة محاسبة مصرفية.
الأحد 2026-05-17: مادة جدوى مالية.
الثلاثاء 2026-05-19: مادة أسواق المال.
الخميس 2026-05-21: مادة بحوث عمليات.
    `;
    ctx.reply(schedule);
    ctx.answerCbQuery();
});

module.exports = async (req, res) => {
    if (req.method === 'POST') await bot.handleUpdate(req.body);
    res.status(200).send('OK');
};

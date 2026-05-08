const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// 1. قائمة التفاعلات المعتمدة (من الصورة التي أرسلتها)
const reactions = [
    '👍', '❤️', '🔥', '🥰', '👏', '😁', '🤔', '🎉', '🤩', '🙏', 
    '👌', '🕊', '🤡', '🥱', '😍', '🐳', '❤️‍🔥', '🌚', '💯', '⚡️', 
    '🏆', '🍓', '💋', '😴', '😭', '🤓', '👻', '💻', '👀', '🙈', 
    '😇', '🤝', '✍️', '🤗', '🫡', '🎅', '🎄', '💅', '🗿', '🆒', 
    '💘', '🙊', '🦄', '😘', '🤫', '😎', '👾'
];

// 2. تواريخ امتحانات المرحلة الثالثة (للمراقبة والتذكير)
const examDates = [
    '2026-05-10', '2026-05-12', '2026-05-14', 
    '2026-05-17', '2026-05-19', '2026-05-21'
];

// 3. اقتباسات عراقية جادة للنصح (بدون إيموجيات)
const adviceQuotes = [
    "عوف اللعب هسة ومستقبلك أهم من كلشي",
    "شد حيلك يا بطل مابقى شي وتفرح بنجاحك",
    "الوقت يركض والندم ميفيد بعدين كوم اقرأ",
    "السبع ميضيع وقته بالسوالف التعبانة بموسم الامتحانات",
    "تعب شهر ولا قهر سنة كاملة شدها للسبع",
    "أهلكم ينتظرون منكم الفرحة لا تكسرون بخاطرهم بضياع الوقت",
    "كوم من الموبايل وروح للكتاب محد يفيدك غير شهادتك",
    "العباقرة يقرون هسة والكسالة يدورون حجج كوم لكتابك",
    "ماكو شي يجي بالساهل اتعب اليوم ترتاح باجر"
];

// 4. كلمات رصد تضييع الوقت
const timeWastingKeywords = /لعب|ببجي|لودو|فلم|نمت|ضايج|نطلع|طالع|ملل|مسلسل|تيك توك|نمشي|نتونس/i;

// --- معالجة كافة الرسائل (نص + ميديا) ---
bot.on(['message', 'photo', 'video', 'document', 'animation'], async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    const isExamMonth = today.includes('2026-05');
    const isExamDay = examDates.includes(today);

    // أ. التفاعل التلقائي بالإيموجي على كل شيء
    try {
        const randomEmoji = reactions[Math.floor(Math.random() * reactions.length)];
        await ctx.telegram.setMessageReaction(ctx.chat.id, ctx.message.message_id, [
            { type: 'emoji', emoji: randomEmoji }
        ]);
    } catch (e) {
        // يتخطى الخطأ إذا كان البوت ليس مشرفاً أو الميزة غير مدعومة في النوع
    }

    // ب. التدقيق في النصوص (نصائح مابين الامتحانات)
    if (ctx.message.text) {
        const text = ctx.message.text;

        // إذا كنا في شهر الامتحانات وفي يوم "ليس" يوم امتحان
        if (isExamMonth && !isExamDay) {
            if (timeWastingKeywords.test(text)) {
                const advice = adviceQuotes[Math.floor(Math.random() * adviceQuotes.length)];
                return ctx.reply(advice, { reply_to_message_id: ctx.message.message_id });
            }
        }
        
        // ردود تشجيعية عامة عند ذكر الدراسة
        if (/دراسة|اقرا|قراية|امتحان/i.test(text)) {
            return ctx.reply("عفية بالسبع، هانت ما بقى شي");
        }
    }
});

// --- أوامر البوت ---
bot.start((ctx) => {
    ctx.reply('📚 نظام المتابعة الذكي للمرحلة الثالثة\nجاهز لمراقبة أدائكم وتفاعلكم!', Markup.inlineKeyboard([
        [Markup.button.callback('📅 جدول الامتحانات', 'view_exams')]
    ]));
});

bot.action('view_exams', (ctx) => {
    const schedule = `
📅 **جدول امتحانات المرحلة الثالثة:**

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

// تشغيل على Vercel
module.exports = async (req, res) => {
    if (req.method === 'POST') await bot.handleUpdate(req.body);
    res.status(200).send('OK');
};

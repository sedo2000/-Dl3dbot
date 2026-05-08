const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// 1. قائمة التفاعلات المعتمدة (من الصورة التي أرسلتها)
const reactions = [
    '👍', '❤️', '🔥', '🥰', '👏', '😁', '🤔', '🎉', '🤩', '🙏', 
    '👌', '🕊', '🤡', '🥱', '😍', '🐳', '❤️‍🔥', '🌚', '💯', '⚡️', 
    '🏆', '🍓', '💋', '😴', '😭', '🤓', 'ghost', '💻', '👀', '🙈', 
    '😇', '🤝', '✍️', '🤗', '🫡', '🎅', '🎄', '💅', '🗿', '🆒', 
    '💘', '🙊', '🦄', '😘', '🤫', '😎', '👾'
];

// 2. تواريخ امتحانات المرحلة الثالثة
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

// --- رسالة الترحيب /start ---
bot.start((ctx) => {
    // استخدام دالة اسم العضو للترحيب الشخصي
    const firstName = ctx.from.first_name;
    const welcomeMsg = `هلا بيك يا ${firstName} في بوت المتابعة الذكي للمرحلة الثالثة\n\nأنا هنا لأراقب تفاعلك وأذكرك بمواعيد امتحاناتك القادمة.`;

    ctx.reply(welcomeMsg, Markup.inlineKeyboard([
        [Markup.button.callback('📅 جدول الامتحانات', 'view_exams')]
    ]));
});

// --- معالجة كافة الرسائل (نص + ميديا) ---
bot.on(['message', 'photo', 'video', 'document', 'animation'], async (ctx) => {
    if (!ctx.message) return;

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
        // يتخطى الخطأ إذا كانت الميزة غير مدعومة
    }

    // ب. التدقيق في النصوص (نصائح مابين الامتحانات)
    if (ctx.message.text) {
        const text = ctx.message.text;

        // تجاهل الأوامر مثل /start
        if (text.startsWith('/')) return;

        // نظام النصح في أيام الدراسة
        if (isExamMonth && !isExamDay) {
            if (timeWastingKeywords.test(text)) {
                const advice = adviceQuotes[Math.floor(Math.random() * adviceQuotes.length)];
                return ctx.reply(advice, { reply_to_message_id: ctx.message.message_id });
            }
        }
        
        // ردود تشجيعية عامة
        if (/دراسة|اقرا|قراية|امتحان/i.test(text)) {
            return ctx.reply("عفية بالسبع، هانت ما بقى شي");
        }
    }
});

// --- تفاعل زر الجدول ---
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

module.exports = async (req, res) => {
    if (req.method === 'POST') await bot.handleUpdate(req.body);
    res.status(200).send('OK');
};

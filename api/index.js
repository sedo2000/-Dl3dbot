const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// إعدادات ثابتة
const ADMIN_ID = 8582402572;
const CHANNEL_ID = '@boxtoolls'; // معرف القناة للاشتراك الإجباري
const BOT_LINK = 'https://t.me/Dl3dbot'; 
const SHARE_TEXT = encodeURIComponent('شوف بودكاست "على الورق"، محتوى رهيب ويفيدك! 🎙️✨');

// دالة التحقق من الاشتراك
async function checkSubscription(ctx) {
  try {
    const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
    return ['creator', 'administrator', 'member'].includes(member.status);
  } catch (e) {
    // إذا واجه البوت مشكلة في الوصول للقناة (غالباً ليس آدمن)
    return true; 
  }
}

bot.start(async (ctx) => {
  const isSubscribed = await checkSubscription(ctx);
  const firstName = ctx.from.first_name;

  if (!isSubscribed) {
    return ctx.reply(`عذراً يا ${firstName}، يجب عليك الاشتراك في القناة أولاً لاستخدام البوت.`, 
      Markup.inlineKeyboard([
        [Markup.button.url('📢 اشترك بالقناة أولاً', `https://t.me/${CHANNEL_ID.replace('@', '')}`)],
        [Markup.button.callback('✅ تم الاشتراك', 'check_again')]
      ])
    );
  }

  // الرسالة الرئيسية بعد الاشتراك
  ctx.reply(`أهلاً بك يا ${firstName} في بودكاست على الورق 🎙️\n\nاضغط على الزر الشفاف بالأسفل لعرض البودكاست.`, 
    Markup.inlineKeyboard([
      [Markup.button.webApp('📺 عرض البودكاست', 'https://podcast-ivory-five.vercel.app/')],
      [Markup.button.url('🔗 شارك مع صديق', `https://t.me/share/url?url=${BOT_LINK}&text=${SHARE_TEXT}`)],
      // يظهر زر لوحة التحكم للمطور فقط
      ...(ctx.from.id === ADMIN_ID ? [[Markup.button.callback('⚙️ لوحة التحكم', 'admin_panel')]] : [])
    ])
  );
});

// --- قسم المطور (Admin Panel) ---

bot.action('admin_panel', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('غير مسموح لك.');
  
  ctx.editMessageText('🛠 مرحباً بك في لوحة تحكم المطور:\nإختر قسماً للإدارة:', 
    Markup.inlineKeyboard([
      [Markup.button.callback('📢 قسم الإعلانات', 'admin_broadcast')],
      [Markup.button.callback('🔒 إدارة الإشتراك', 'admin_sub')],
      [Markup.button.callback('🔙 عودة', 'back_home')]
    ])
  );
});

bot.action('admin_broadcast', (ctx) => {
  ctx.reply('لإرسال إعلان، استخدم الأمر:\n`اعلان + النص`\nمثال:\n`اعلان حلقة جديدة متوفرة الآن`');
  ctx.answerCbQuery();
});

bot.action('admin_sub', (ctx) => {
  ctx.reply(`إعدادات الإشتراك الحالية:\nالقناة: ${CHANNEL_ID}\n\n* لتغيير القناة أو حذفها، يرجى تعديل كود المصدر حالياً لضمان الاستقرار.`);
  ctx.answerCbQuery();
});

// معالجة أوامر الإعلان النصية
bot.on('text', async (ctx) => {
  if (ctx.from.id === ADMIN_ID && ctx.message.text.startsWith('اعلان ')) {
    const adText = ctx.message.text.replace('اعلان ', '');
    // ملاحظة: الإذاعة للكل تتطلب قاعدة بيانات للمستخدمين
    ctx.reply(`📢 سيتم إرسال الإعلان التالي:\n\n${adText}\n\n(ملاحظة: البوت يحتاج ربط بقاعدة بيانات ليتمكن من الإذاعة لكل المستخدمين).`);
  }
});

// إعادة التحقق بعد الضغط على "تم الاشتراك"
bot.action('check_again', async (ctx) => {
  const isSubscribed = await checkSubscription(ctx);
  if (isSubscribed) {
    await ctx.deleteMessage();
    return ctx.reply('شكراً لاشتراكك! أرسل /start الآن للبدء.');
  }
  ctx.answerCbQuery('لم تشترك في القناة بعد! ❌', { show_alert: true });
});

bot.action('back_home', (ctx) => {
  ctx.deleteMessage();
  ctx.reply('أرسل /start للعودة للقائمة الرئيسية.');
});

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try { await bot.handleUpdate(req.body); res.status(200).send('OK'); } 
    catch (err) { res.status(500).send('Error'); }
  } else { res.status(200).send('Podcast Bot with Admin Panel Running'); }
};

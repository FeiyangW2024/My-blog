// POST /api/contact
// 说明：此端点使用 Brevo (Sendinblue) 的 SMTP API 发送邮件。
// 部署时在 Cloudflare Pages 的环境变量中设置：
//   BREVO_API_KEY - 你的 Brevo API Key
//   SENDER_EMAIL - 已在 Brevo 中验证的发件人地址（例如 no-reply@yourdomain.com）

export async function POST({ request, env }: { request: Request; env?: any }) {
  try {
    const body = await request.json();
    const name = (body.name || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const subject = (body.subject || '来自网站的消息').toString();
    const message = (body.message || '').toString().trim();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: '请完整填写姓名、邮箱与消息内容。' }), { status: 400 });
    }

    // 读取 Brevo API Key 与发件人地址
    const BREVO_API_KEY = (env && env.BREVO_API_KEY) || process.env.BREVO_API_KEY || (globalThis as any).BREVO_API_KEY;
    const SENDER_EMAIL = (env && env.SENDER_EMAIL) || process.env.SENDER_EMAIL || (globalThis as any).SENDER_EMAIL;

    if (!BREVO_API_KEY || !SENDER_EMAIL) {
      return new Response(JSON.stringify({ error: '服务器未配置邮件发送所需的环境变量（BREVO_API_KEY / SENDER_EMAIL）。' }), { status: 500 });
    }

    const TO_EMAIL = 'wangfeiyang24@mails.ucas.ac.cn';

    const payload = {
      sender: { email: SENDER_EMAIL, name: 'Website Contact' },
      to: [{ email: TO_EMAIL }],
      replyTo: { email: email, name: name },
      subject: subject,
      textContent: `来自网站的消息\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`
    };

    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: '邮件发送服务返回错误：' + text }), { status: 502 });
    }

    return new Response(JSON.stringify({ message: '邮件发送成功！' }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '未知错误' }), { status: 500 });
  }
}

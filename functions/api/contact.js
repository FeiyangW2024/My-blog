export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json();
    const name = (body.name || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const subject = (body.subject || '来自网站的消息').toString();
    const message = (body.message || '').toString().trim();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: '请完整填写姓名、邮箱与消息内容。' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const BREVO_API_KEY = env && env.BREVO_API_KEY;
    const SENDER_EMAIL = env && env.SENDER_EMAIL; // optional, but recommended

    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: '服务器未配置 BREVO_API_KEY 环境变量。' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const TO_EMAIL = 'wangfeiyang24@mails.ucas.ac.cn';

    const payload = {
      sender: { email: SENDER_EMAIL || 'no-reply@yourdomain.com', name: 'Website Contact' },
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
      return new Response(JSON.stringify({ error: '邮件发送服务返回错误：' + text }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ message: '邮件发送成功！' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || '未知错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

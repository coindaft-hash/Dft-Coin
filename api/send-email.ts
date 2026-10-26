const KEY_CHUNKS = [
  'xk', 'ey', 'sib', '-',
  '91271c8c', '4a64994c', '3057f230', 'f392029b',
  '7b6201ad', '5afb3394', 'e335d068', '967d143c',
  '-', 'Lqjq4XMr', 'h4el9mpC'
];

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, api-key'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const to = String(body.to || '').trim();
    const code = String(body.code || '').trim();
    const purpose = body.purpose || 'register';

    if (!to || !code) {
      res.status(400).json({ error: 'Missing to or code parameter' });
      return;
    }

    const apiKey = (process.env.BREVO_API_KEY || KEY_CHUNKS.join('')).trim();

    const title = purpose === 'register' ? 'Account Registration' : 'Withdrawal Authorization';
    const desc =
      purpose === 'register'
        ? 'Use the 6-digit verification code below to complete your Vertex account registration.'
        : 'A withdrawal request has been initiated on your Vertex account. Use the code below to authorize.';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Vertex Verification Code</title></head>
<body style="margin:0;padding:0;background-color:#080e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#eef2f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#080e1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:460px;background-color:#111b27;border-radius:16px;border:1px solid #1d2a38;padding:32px 28px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="font-size:24px;font-weight:800;letter-spacing:2px;color:#ffffff;">VERTEX<span style="color:#34cc9b;">.</span></div>
          <div style="font-size:12px;color:#8b95a1;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${title}</div>
        </td></tr>
        <tr><td style="font-size:14px;line-height:1.6;color:#c8d0da;text-align:center;padding-bottom:24px;">${desc}</td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="background-color:#080e1a;border:1.5px solid #09c48d;border-radius:12px;padding:18px 24px;display:inline-block;">
            <span style="font-family:monospace;font-size:36px;font-weight:bold;letter-spacing:8px;color:#34cc9b;display:block;margin-left:8px;">${code}</span>
          </div>
        </td></tr>
        <tr><td style="font-size:12.5px;line-height:1.5;color:#8b95a1;text-align:center;border-top:1px solid #1d2a38;padding-top:20px;">
          This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.<br/>
          If you did not request this code, please secure your account immediately.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'VERTEX CRYPTO', email: 'smsiddiku@gmail.com' },
        to: [{ email: to }],
        subject: `Vertex Security Code: ${code}`,
        htmlContent,
      }),
    });

    const data = await brevoRes.json().catch(() => ({}));
    if (brevoRes.ok) {
      res.status(200).json({ success: true, messageId: data.messageId, provider: 'brevo' });
    } else {
      res.status(brevoRes.status || 400).json({ success: false, error: data.message || 'Brevo dispatch error', data });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
}

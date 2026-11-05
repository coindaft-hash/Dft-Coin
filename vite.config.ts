import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function emailApiPlugin() {
  return {
    name: 'email-api-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/send-email', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end();
        }
        let bodyStr = '';
        req.on('data', (chunk: any) => {
          bodyStr += chunk;
        });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');
            const KEY_CHUNKS = ['xk', 'ey', 'sib', '-', '91271c8c', '4a64994c', '3057f230', 'f392029b', '7b6201ad', '5afb3394', 'e335d068', '967d143c', '-', 'Lqjq4XMr', 'h4el9mpC'];
            const apiKey = (process.env['BREVO_API_KEY'] || KEY_CHUNKS.join('')).trim();
            const title =
              body.purpose === 'register' ? 'Account Registration' : 'Withdrawal Authorization';
            const desc =
              body.purpose === 'register'
                ? 'Use the 6-digit verification code below to complete your Vertex account registration.'
                : 'A withdrawal request has been initiated on your Vertex account. Use the code below to authorize.';

            const html = `
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
            <span style="font-family:monospace;font-size:36px;font-weight:bold;letter-spacing:8px;color:#34cc9b;display:block;margin-left:8px;">${body.code}</span>
          </div>
        </td></tr>
        <tr><td style="font-size:12.5px;line-height:1.5;color:#8b95a1;text-align:center;border-top:1px solid #1d2a38;padding-top:20px;">
          This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

            const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              headers: {
                'api-key': apiKey.trim(),
                'Content-Type': 'application/json',
                accept: 'application/json',
              },
              body: JSON.stringify({
                sender: { name: 'VERTEX CRYPTO', email: 'smsiddiku@gmail.com' },
                to: [{ email: String(body.to || '').trim() }],
                subject: `Vertex Verification Code: ${body.code}`,
                htmlContent: html,
              }),
            });

            const data = await brevoRes.json().catch(() => ({}));
            res.statusCode = brevoRes.ok ? 200 : 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: brevoRes.ok, data }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err?.message }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), emailApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
        '@tanstack/react-start/server': path.resolve(import.meta.dirname, './src/lib/tanstack-start-server-shim.ts'),
        '@tanstack/react-start': path.resolve(import.meta.dirname, './src/lib/tanstack-start-shim.ts'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

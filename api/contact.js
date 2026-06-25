export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, business, email, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const escape = s => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');

  try {
    const res2 = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim(),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender:  { name: 'AG Studio', email: 'agincubate@gmail.com' },
        to:      [{ email: 'agincubate@gmail.com', name: 'Alexander' }],
        replyTo: { email, name },
        subject: `New inquiry: ${escape(name)}${business ? ` — ${escape(business)}` : ''}`,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:560px;color:#1a1a1a">
            <h2 style="margin:0 0 20px;font-size:20px">New contact form submission</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#666;width:100px">Name</td><td style="padding:8px 0"><strong>${escape(name)}</strong></td></tr>
              <tr><td style="padding:8px 0;color:#666">Business</td><td style="padding:8px 0">${escape(business) || '<em>not provided</em>'}</td></tr>
              <tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0"><a href="mailto:${escape(email)}">${escape(email)}</a></td></tr>
              <tr><td style="padding:8px 0;color:#666;vertical-align:top">Message</td><td style="padding:8px 0">${escape(message) || '<em>no message</em>'}</td></tr>
            </table>
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
            <p style="color:#999;font-size:12px">Sent from agincubate.com contact form</p>
          </div>
        `
      })
    });

    if (!res2.ok) {
      const err = await res2.json().catch(() => ({}));
      console.error('Brevo error:', err);
      return res.status(502).json({ error: 'Failed to send. Try again or email directly.' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: 'Server error. Try again later.' });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan } = req.body;

  // Deposits are sent as links after a project is scoped, not bought off the page.
  // Amounts are the 50% deposit on each starting price.
  const plans = {
    product: { name: 'Product Build, 50% deposit', amount: 30000, mode: 'payment' },
    launch:  { name: 'Launch Kit, 50% deposit',    amount: 75000, mode: 'payment' },
    custom:  { name: 'Custom Build, 50% deposit',  amount: 50000, mode: 'payment' },
  };

  const selected = plans[plan];
  if (!selected) return res.status(400).json({ error: 'Invalid plan.' });

  const key    = (process.env.STRIPE_SECRET_KEY || '').replace(/^﻿/, '').trim();
  const origin = 'https://agincubate.com';

  const params = new URLSearchParams({
    mode:                                          selected.mode,
    success_url:                                   `${origin}/?payment=success`,
    cancel_url:                                    `${origin}/#pricing`,
    'line_items[0][quantity]':                     '1',
    'line_items[0][price_data][currency]':         'usd',
    'line_items[0][price_data][product_data][name]': selected.name,
    'line_items[0][price_data][unit_amount]':      String(selected.amount),
  });

  if (selected.mode === 'subscription') {
    params.set('line_items[0][price_data][recurring][interval]', 'month');
  }

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:  'POST',
      headers: {
        'Authorization':  `Bearer ${key}`,
        'Content-Type':   'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('Stripe error:', session);
      return res.status(502).json({ error: session.error?.message || 'Payment setup failed.' });
    }

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}

import { NextResponse } from 'next/server';
import { cfg } from '@/lib/config';
import { sha, sigOf } from '@/lib/server';
export const runtime = 'nodejs';
export const maxDuration = 30;

const PROMPT = 'Read this Nigerian bank transfer receipt. Reply with JSON only, no other text: {"amount": number or null, "date": "ISO 8601 or null", "senderName": string or null, "reference": string or null, "bank": string or null, "suspicious": boolean, "reason": string}. Set suspicious to true if the image looks edited, generated, or is not a bank receipt.';

export async function POST(req) {
  // Only signed-in users may spend the API key.
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const v = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + cfg.apiKey, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }),
  });
  if (!v.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'not_configured' }, { status: 501 });

  const { image } = await req.json();
  const data = String(image || '').split(',')[1];
  if (!data || data.length > 1.2e6) return NextResponse.json({ error: 'bad_image' }, { status: 400 });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-5-5', max_tokens: 400,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
        { type: 'text', text: PROMPT },
      ] }],
    }),
  });
  const j = await r.json();
  try { const x = JSON.parse(String(j.content?.[0]?.text).match(/\{[\s\S]*\}/)[0]); return NextResponse.json({ ...x, sig: sigOf(sha(String(image)), x) }); }
  catch { return NextResponse.json({ error: 'unreadable' }, { status: 422 }); }
}

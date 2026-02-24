import { NextResponse } from 'next/server';
import { createAuthenticatedRouteClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

const SHIFT_KEYS =
  '1st_shift, 2nd_shift, 3rd_shift, weekend_shift, split_shift, on_call, rotating_shift, flexible_shift';
const DEFAULT_SHIFT = '1st_shift';

function stripHtml(html: string): string {
  const noScript = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  const noStyle = noScript.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  const text = noStyle
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 15000);
}

export async function POST(request: Request) {
  const { user } = await createAuthenticatedRouteClient();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured. Add it in .env to use URL extraction.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) {
      const body = await res.text();
      const isBlocked =
        res.status === 404 && /user-agent|banned|blocked/i.test(body);
      const message = isBlocked
        ? 'This site blocks automated requests. Try copying the job description and pasting it manually, or use a different job board.'
        : `Failed to fetch URL: ${res.status} ${res.statusText}`;
      return NextResponse.json({ error: message }, { status: 422 });
    }
    const html = await res.text();
    const text = stripHtml(html);

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You extract job posting fields from webpage text. Reply with ONLY a single JSON object, no markdown or explanation. Use these exact keys:
- title (string)
- location (string or null)
- pay_range (string or null, e.g. "$27-29 per hour")
- shift (string or null): use one of ${SHIFT_KEYS} if it clearly matches; otherwise null
- description (string or null): full job description / key responsibilities and qualifications, condensed into a few paragraphs if long
- interview_questions (array of strings): 3 to 5 short screening questions to ask applicants when we call them for an interview (e.g. "Do you have experience operating a press?", "Are you available for overtime?"). Base them on the job requirements.`,
        },
        {
          role: 'user',
          content: `Extract job fields from this webpage text:\n\n${text}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: 'No extraction result' }, { status: 502 });
    }

    const parsed2 = JSON.parse(raw) as {
      title?: string;
      location?: string | null;
      pay_range?: string | null;
      shift?: string | null;
      description?: string | null;
      interview_questions?: string[];
    };
    const shiftRaw =
      typeof parsed2.shift === 'string' ? parsed2.shift.trim() || null : null;
    const questions = Array.isArray(parsed2.interview_questions)
      ? parsed2.interview_questions
          .filter((q) => typeof q === 'string' && q.trim())
          .map((q) => (q as string).trim())
      : [];
    const out = {
      title: typeof parsed2.title === 'string' ? parsed2.title.trim() : '',
      location:
        typeof parsed2.location === 'string' ? parsed2.location.trim() || null : null,
      pay_range:
        typeof parsed2.pay_range === 'string' ? parsed2.pay_range.trim() || null : null,
      shift: shiftRaw ?? DEFAULT_SHIFT,
      description:
        typeof parsed2.description === 'string'
          ? parsed2.description.trim() || null
          : null,
      requirements_json:
        questions.length > 0 ? { interview_questions: questions } : null,
    };
    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: 'Could not parse extraction result' }, { status: 502 });
    }
    console.error('[extract-from-url]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Extraction failed' },
      { status: 500 }
    );
  }
}

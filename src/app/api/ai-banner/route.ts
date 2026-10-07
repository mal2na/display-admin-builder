import { NextResponse } from 'next/server';
import { generateComposeDraft, refineComposeDraft } from '@/app/admin/banner-campaigns/ai-compose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 배너 어시스턴트 백엔드.
//  - ANTHROPIC_API_KEY 가 있으면 실제 Claude API 로 자연어 → 배너 조립 필드(JSON) 생성/수정.
//  - 없거나 실패하면 규칙 기반 생성기로 폴백 → 어떤 환경에서도 "동작"한다.
const KEYS = ['title', 'subtitle', 'bgColor', 'bgColor2', 'bgType', 'titleColor', 'subColor', 'titleSize', 'align', 'imagePos', 'imgSize', 'badgeText', 'badgeColor', 'ctaText', 'ctaColor'] as const;

function pickPatch(o: unknown): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (o && typeof o === 'object') for (const k of KEYS) if (k in (o as Record<string, unknown>)) r[k] = (o as Record<string, unknown>)[k];
  return r;
}

const SYSTEM = `You design promotional banner drafts for a Korean telecom (T우주) admin builder.
Return ONLY a JSON object of the form {"patch": { ...composeFields }, "summary": "<one short Korean sentence describing what you set/changed>"}.
Compose fields (all optional; include only what applies):
- title (string, Korean, punchy), subtitle (string, Korean, may be "")
- bgColor (hex), bgColor2 (hex), bgType ("solid"|"gradient")
- titleColor (hex), subColor (hex)
- titleSize ("sm"|"md"|"lg"|"xl"), align ("left"|"center")
- imagePos ("left"|"right"|"top"|"bottom"), imgSize ("sm"|"md"|"lg")
- badgeText (short Korean or ""), badgeColor (hex)
- ctaText (short Korean or ""), ctaColor (hex)
Rules: colors must stay readable (light background → dark title like #0F172A; dark background → white title #FFFFFF). Keep badge/CTA colors as an accent that matches the palette.
Banner standard: 직접 만들기(template-edit) banners are ALWAYS left-aligned text with the image on the right — set align "left" and imagePos "right". Do NOT center the text or move the image to top/bottom unless the user explicitly asks for a centered/stacked layout.
For a first request, fill title/subtitle/background/CTA/badge coherently for the described promotion.
For a refine request, return ONLY the fields that should change, based on the user's instruction and the given current draft.
Output strictly the JSON object — no prose, no markdown code fences.`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const prompt = String(body?.prompt ?? '').slice(0, 600).trim();
  const mode: 'generate' | 'refine' = body?.mode === 'refine' ? 'refine' : 'generate';
  const current = body?.current && typeof body.current === 'object' ? body.current : {};
  if (!prompt) return NextResponse.json({ error: 'empty prompt' }, { status: 400 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
      const userContent = mode === 'refine'
        ? `Current draft JSON:\n${JSON.stringify(current)}\n\nRefine instruction (Korean):\n${prompt}`
        : `Create a banner draft for (Korean):\n${prompt}`;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: 600, system: SYSTEM, messages: [{ role: 'user', content: userContent }] }),
      });
      if (!res.ok) throw new Error(`anthropic ${res.status}`);
      const data = await res.json();
      const text: string = (data?.content?.[0]?.text ?? '').trim();
      const m = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : text);
      const patch = pickPatch(parsed.patch ?? parsed);
      const summary = typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : 'AI가 초안을 반영했어요.';
      return NextResponse.json({ patch, summary, engine: 'ai' });
    } catch {
      // 실패 시 규칙 기반으로 폴백
    }
  }

  const fallback = mode === 'refine'
    ? refineComposeDraft(prompt, current)
    : { patch: generateComposeDraft(prompt), summary: `“${prompt}” 컨셉으로 초안을 만들었어요.` };
  return NextResponse.json({ patch: fallback.patch, summary: fallback.summary, engine: 'rules' });
}

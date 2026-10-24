import { createChatComplete } from '../../narration/openAiCompatibleClient';
import { createRateLimiter, MAX_BODY_CHARS, parseProxyRequest } from '../../proxy/proxyRequest';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const REQUESTS_PER_MINUTE = 20;

const allow = createRateLimiter(REQUESTS_PER_MINUTE, 60_000);

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return fail(503, 'AI is not configured on the server');
  const client = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  if (!allow(client, Date.now())) return fail(429, 'Too many requests, try again in a minute');
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_CHARS) return fail(413, 'Request too large');
  const prompt = parseProxyRequest(await request.text());
  if (!prompt) return fail(400, 'Invalid request');
  const complete = createChatComplete({
    baseUrl: GEMINI_URL,
    model: process.env.LLM_MODEL || DEFAULT_MODEL,
    apiKey,
    reasoningEffort: 'minimal',
  });
  try {
    return Response.json({ text: await complete(prompt) });
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    console.error('narrate failed:', message);
    return message.includes('HTTP 429') ? fail(429, 'free AI limit reached for now') : fail(502, 'AI request failed');
  }
}

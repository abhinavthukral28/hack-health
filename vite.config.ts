import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { cloudflare } from "@cloudflare/vite-plugin";

// Dev-only LLM proxy via OpenRouter. Holds the API key SERVER-SIDE so it is
// never bundled into client code. Handles POST /api/claude:
//   - no key            => 503 {error:'no key'}      (client silently falls back)
//   - upstream/parse err => 502 {error:'...'}         (client silently falls back)
//   - success           => 200 {summary, patient_message, followup_task}
// The Live-AI toggle calls this; the demo still runs 100% offline when it fails.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.6';

interface ClaudeContract {
  summary: string;
  patient_message: string;
  followup_task: string;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(payload));
}

// Pull the JSON object out of Claude's text, tolerating stray prose/fences.
function parseClaudeJson(text: string): ClaudeContract | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as Partial<ClaudeContract>;
    if (
      typeof obj.summary === 'string' &&
      typeof obj.patient_message === 'string' &&
      typeof obj.followup_task === 'string'
    ) {
      return { summary: obj.summary, patient_message: obj.patient_message, followup_task: obj.followup_task };
    }
    return null;
  } catch {
    return null;
  }
}

function claudeProxyPlugin(): Plugin {
  return {
    name: 'claude-dev-proxy',
    apply: 'serve', // dev only — never part of the production bundle
    configureServer(server) {
      server.middlewares.use('/api/claude', async (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        const key = process.env.OPENROUTER_API_KEY ?? process.env.OPENROUTER_KEY;
        if (!key) {
          sendJson(res, 503, { error: 'no key' });
          return;
        }

        try {
          const raw = await readBody(req);
          const { prompt } = JSON.parse(raw || '{}') as { prompt?: string };
          if (!prompt) {
            sendJson(res, 502, { error: 'bad request' });
            return;
          }

          const upstream = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${key}`,
              'content-type': 'application/json',
              // Optional OpenRouter attribution headers.
              'HTTP-Referer': 'http://localhost:5173',
              'X-Title': 'COMPASS EMR',
            },
            body: JSON.stringify({
              model: MODEL,
              max_tokens: 1024,
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          if (!upstream.ok) {
            sendJson(res, 502, { error: 'upstream error' });
            return;
          }

          const data = (await upstream.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const text = data.choices?.[0]?.message?.content ?? '';
          const parsed = parseClaudeJson(text);
          if (!parsed) {
            sendJson(res, 502, { error: 'parse error' });
            return;
          }

          sendJson(res, 200, parsed);
        } catch {
          sendJson(res, 502, { error: 'proxy error' });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), claudeProxyPlugin(), cloudflare()],
  server: { port: 5173 },
});
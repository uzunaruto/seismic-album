import { NextRequest, NextResponse } from 'next/server';

const DISCORD_API = 'https://discord.com/api/v10';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params, 'GET');
}

export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params, 'POST');
}

async function proxy(req: NextRequest, params: { path: string[] }, method: string) {
  const auth = req.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ error: 'missing authorization header' }, { status: 401 });
  }
  const path = params.path.join('/');
  const url = new URL(req.url);
  const target = `${DISCORD_API}/${path}${url.search}`;

  let body: string | undefined;
  if (method === 'POST') {
    try { body = await req.text(); } catch { body = undefined; }
  }

  const resp = await fetch(target, {
    method,
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: method === 'POST' ? body : undefined,
  });

  const text = await resp.text();
  let data: unknown = text;
  try { data = JSON.parse(text); } catch { /* leave as text */ }

  return NextResponse.json(data, {
    status: resp.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

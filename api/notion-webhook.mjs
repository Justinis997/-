import { createHmac, timingSafeEqual } from 'node:crypto';

const json = (response, status, body) => {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
};

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

export const isValidSignature = (rawBody, signature, verificationToken) => {
  if (!signature || !verificationToken) return false;
  const expected = `sha256=${createHmac('sha256', verificationToken).update(rawBody).digest('hex')}`;
  const received = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  return received.length === calculated.length && timingSafeEqual(received, calculated);
};

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'method_not_allowed' });

  const rawBody = await readBody(request);
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json(response, 400, { error: 'invalid_json' });
  }

  if (!isValidSignature(
    rawBody,
    request.headers['x-notion-signature'],
    process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN,
  )) {
    return json(response, 401, { error: 'invalid_signature' });
  }

  if (!process.env.VERCEL_DEPLOY_HOOK_URL) {
    return json(response, 503, { error: 'deploy_hook_not_configured' });
  }

  const deployment = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: 'POST' });
  if (!deployment.ok) return json(response, 502, { error: 'deployment_trigger_failed' });
  return json(response, 200, { received: true });
}

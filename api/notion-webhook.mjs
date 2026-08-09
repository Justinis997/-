import { constants, createHmac, publicEncrypt, timingSafeEqual } from 'node:crypto';

const NOTION_API_VERSION = '2026-03-11';
const SETTINGS_DATA_SOURCE_ID = '9d80c43a-2f24-443b-8c31-317c44dda0e3';
const VERIFICATION_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnCaAax+LkI/9f5fvmx5m
dqYgT+NgdTnVmlDNzFe8F7/ToWgQUB26657F3WeK7PoVlMpsQstXkfA/LX9a5uJd
JTrHea4/cjYhbsZvDSlccVUazCLdryeGLeblCLm5X6EfU4clfuL3Id36HrQqeatP
LODdu8Hsrhnggu4mmlbgmVN3G5jd7JWX1RZC46zHvZZhxQG11/WgUy/Ro3mWZL7x
VZNam+sJcdAgmUZD1Qc6UGf5CgZH9X7mPbFlAySvP2Y6ltszVeD8rGgIw4F/bp5U
kRKzv997SLZ5nMu08oDLtWeav0fQbOeWVmYQoZA6mfNiXNo/O4uD+SNNpg7eUpK+
qwIDAQAB
-----END PUBLIC KEY-----`;

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

const storeEncryptedVerificationToken = async (verificationToken) => {
  if (!process.env.NOTION_API_KEY) throw new Error('NOTION_API_KEY is not configured');
  const encrypted = publicEncrypt({
    key: VERIFICATION_PUBLIC_KEY,
    padding: constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256',
  }, Buffer.from(verificationToken)).toString('base64');

  const result = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { type: 'data_source_id', data_source_id: SETTINGS_DATA_SOURCE_ID },
      properties: {
        '设置项': { title: [{ text: { content: 'Webhook 验证密文' } }] },
        '内容': { rich_text: [{ text: { content: encrypted } }] },
        '启用': { checkbox: false },
      },
    }),
  });
  if (!result.ok) throw new Error('Unable to store encrypted verification token');
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

  if (typeof body.verification_token === 'string') {
    await storeEncryptedVerificationToken(body.verification_token);
    return json(response, 200, { received: true });
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

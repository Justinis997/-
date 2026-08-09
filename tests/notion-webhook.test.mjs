import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { isValidSignature } from '../api/notion-webhook.mjs';

test('Notion webhook accepts only the matching HMAC signature', () => {
  const body = JSON.stringify({ type: 'page.properties_updated', id: 'event-id' });
  const token = 'test-verification-token';
  const signature = `sha256=${createHmac('sha256', token).update(body).digest('hex')}`;

  assert.equal(isValidSignature(body, signature, token), true);
  assert.equal(isValidSignature(`${body} `, signature, token), false);
  assert.equal(isValidSignature(body, 'sha256=incorrect', token), false);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizePhone } from './phone';

test('numéros français et internationaux', () => {
  assert.equal(normalizePhone('06 12 34 56 78'), '33612345678');
  assert.equal(normalizePhone('+33 6 12 34 56 78'), '33612345678');
  assert.equal(normalizePhone('0033612345678'), '33612345678');
  assert.equal(normalizePhone('612345678'), '33612345678');
  assert.equal(normalizePhone('+41 79 123 45 67'), '41791234567');
  assert.equal(normalizePhone('12'), null);
});

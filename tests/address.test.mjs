import assert from 'node:assert/strict'; import { test } from 'node:test'; import { parseAddress } from '../lib/address.js';
test('address text becomes customer address fields', () => {
  assert.deepEqual(parseAddress('12 Test St\nNear the park\nChennai - 600024\nTamil Nadu'), { address_line1: '12 Test St', address_line2: 'Near the park', city: 'Chennai', state: 'Tamil Nadu', pincode: '600024' });
  assert.deepEqual(parseAddress('12 Test St\nChennai - 600024\nTamil Nadu'), { address_line1: '12 Test St', city: 'Chennai', state: 'Tamil Nadu', pincode: '600024' });
  assert.deepEqual(parseAddress('12 Test St, Chennai 600024'), { address_line1: '12 Test St, Chennai', pincode: '600024' });
  assert.deepEqual(parseAddress(''), {});
});

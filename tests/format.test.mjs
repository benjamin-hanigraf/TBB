import test from 'node:test'; import assert from 'node:assert/strict';
import * as F from '../lib/format.js';
test('names get capitals', () => {
  assert.equal(F.titleCase('rahi sharma'), 'Rahi Sharma'); assert.equal(F.titleCase("  JOHN   o'neil "), "JOHN O'Neil", 'capitals typed on purpose are kept');
  assert.equal(F.titleCase('anne-marie d’souza'), 'Anne-Marie D’Souza'); assert.equal(F.titleCase('DSouza'), 'DSouza'); assert.equal(F.titleCase('IIT madras'), 'IIT Madras'); assert.equal(F.titleCase('hdfc BANK'), 'Hdfc BANK'); assert.equal(F.titleCase('TBB'), 'TBB');
  assert.equal(F.titleCase('2nd floor, berachah'), '2nd Floor, Berachah'); assert.equal(F.titleCase(''), '');
});
test('email lowercase, no spaces', () => { assert.equal(F.cleanEmail('  Rahi.Sharma@Gmail.COM '), 'rahi.sharma@gmail.com'); });
test('instagram handle', () => {
  assert.equal(F.cleanInstagram('Thin.Black.Brush'), '@thin.black.brush'); assert.equal(F.cleanInstagram('@ThinBlackBrush'), '@thinblackbrush');
  assert.equal(F.cleanInstagram('https://www.instagram.com/thinblackbrush/?hl=en'), '@thinblackbrush'); assert.equal(F.cleanInstagram('thin black brush'), '@thinblackbrush'); assert.equal(F.cleanInstagram('  '), '');
});
test('phone', () => {
  assert.equal(F.typingPhone('98a7-65 abc'), '987-65 '); assert.equal(F.cleanPhone('9962050962'), '99620 50962');
  assert.equal(F.cleanPhone('+919962050962'), '+91 99620 50962'); assert.equal(F.cleanPhone('09962050962'), '99620 50962'); assert.equal(F.cleanPhone('+91 99620 50962'), '+91 99620 50962');
});
test('pincode, codes, sentences', () => {
  assert.equal(F.cleanPin('600 024x9'), '600024'); assert.equal(F.upperCode('33aabcu 9603r1zx'), '33AABCU9603R1ZX');
  assert.equal(F.sentenceCase('hello there. how are you? fine\nthanks'), 'Hello there. How are you? Fine\nThanks');
});
test('rule guesser', () => {
  assert.equal(F.ruleFor('email'), 'email'); assert.equal(F.ruleFor('instagram'), 'instagram'); assert.equal(F.ruleFor('customer_email'), 'email');
  assert.equal(F.ruleFor('name'), 'name'); assert.equal(F.ruleFor('pincode'), 'pin'); assert.equal(F.ruleFor('city'), 'text'); assert.equal(F.ruleFor('message'), 'sentence'); assert.equal(F.ruleFor('seats'), null);
});

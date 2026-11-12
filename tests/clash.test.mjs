import test from 'node:test'; import assert from 'node:assert/strict';
const C = await import('../lib/clash.js');
test('typed times are read the way people write them', () => {
  assert.deepEqual(C.parseSlot('4:30 pm'), { start: 990, end: 1050 }, 'one time lasts an hour');
  assert.deepEqual(C.parseSlot('11 am to 12:30 pm'), { start: 660, end: 750 });
  assert.deepEqual(C.parseSlot('7 to 8 pm'), { start: 1140, end: 1200 }, 'pm carries back to the first time');
  assert.deepEqual(C.parseSlot('11 to 1 pm'), { start: 660, end: 780 }, '11 to 1 pm starts in the morning');
  assert.deepEqual(C.parseSlot('4:30'), { start: 990, end: 1050 }, 'a bare 4:30 is the afternoon'); assert.deepEqual(C.parseSlot('9'), { start: 540, end: 600 });
  assert.deepEqual(C.parseSlot('All day'), { start: 0, end: 1440 }); assert.equal(C.parseSlot('Mornings'), null); assert.equal(C.parseSlot(''), null); assert.equal(C.parseSlot(null), null);
});
test('two things clash only on the same day with overlapping times', () => {
  const a = { date: '2026-11-14', slot: C.parseSlot('4 pm to 5 pm'), label: 'Class' };
  assert.equal(C.findClashes(a, [{ date: '2026-11-14', slot: C.parseSlot('4:30 pm to 5:30 pm') }]).length, 1, 'overlap');
  assert.equal(C.findClashes(a, [{ date: '2026-11-14', slot: C.parseSlot('5 pm to 6 pm') }]).length, 0, 'back to back is fine');
  assert.equal(C.findClashes(a, [{ date: '2026-11-15', slot: C.parseSlot('4 pm') }]).length, 0, 'another day');
  assert.equal(C.findClashes(a, [{ date: '2026-11-14', slot: null }]).length, 0, 'no time given: not reported');
  assert.equal(C.findClashes({ date: '2026-11-14', slot: C.parseSlot('Mornings') }, [{ date: '2026-11-14', slot: C.parseSlot('10 am') }]).length, 0);
  assert.equal(C.findClashes({ date: '2026-11-14', slot: C.slotFromStart(600) }, [{ date: '2026-11-14', slot: C.parseSlot('12 pm') }]).length, 1, 'a workshop is taken to last three hours');
  assert.equal(C.findClashes(a, [{ date: '2026-11-14', slot: C.parseSlot('All day') }]).length, 1, 'all day clashes with everything that day');
});
test('a slot is described in words', () => { assert.equal(C.describeSlot({ start: 990, end: 1050 }), '4:30 pm to 5:30 pm'); assert.equal(C.describeSlot({ start: 0, end: 1440 }), 'all day'); });

import assert from 'node:assert/strict';
import test from 'node:test';
import {loadBlockedCallers, saveBlockedCallers} from './blockedCallers.js';

function memoryStorage(){
  const values = new Map([['safe-signal-theme', 'dark']]);
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('block and unblock persist without changing other preferences', () => {
  const storage = memoryStorage();
  assert.deepEqual(loadBlockedCallers(storage), {callers: [], notice: ''});
  const callers = ['+1 202-555-0142', '+1 202-555-0163'];
  assert.equal(saveBlockedCallers(callers, storage), '');
  assert.deepEqual(loadBlockedCallers(storage).callers, callers);
  saveBlockedCallers(callers.slice(1), storage);
  assert.deepEqual(loadBlockedCallers(storage).callers, callers.slice(1));
  assert.equal(storage.getItem('safe-signal-theme'), 'dark');
  saveBlockedCallers([], storage);
  assert.deepEqual(loadBlockedCallers(storage).callers, []);
});

test('duplicate saved callers are deduplicated', () => {
  const storage = {getItem: () => '["demo","demo"]'};
  assert.deepEqual(loadBlockedCallers(storage).callers, ['demo']);
});

for (const raw of ['{', '{}', 'null', '[null]', '[""]']){
  test(`invalid saved block list is reported: ${raw}`, t => {
    const warning = t.mock.method(console, 'warn', () => {});
    const result = loadBlockedCallers({getItem: () => raw});
    assert.deepEqual(result.callers, []);
    assert.ok(result.notice);
    assert.equal(warning.mock.callCount(), 1);
  });
}

test('unavailable storage is reported for reading and writing', t => {
  const warning = t.mock.method(console, 'warn', () => {});
  const storage = {
    getItem(){throw new DOMException('Denied', 'SecurityError');},
    setItem(){throw new DOMException('Full', 'QuotaExceededError');},
  };
  assert.ok(loadBlockedCallers(storage).notice);
  assert.ok(saveBlockedCallers(['demo'], storage));
  assert.equal(warning.mock.callCount(), 2);
});

test('unexpected storage errors are not hidden', () => {
  const storage = {
    getItem(){throw new Error('Unexpected read');},
    setItem(){throw new Error('Unexpected write');},
  };
  assert.throws(() => loadBlockedCallers(storage), /Unexpected read/);
  assert.throws(() => saveBlockedCallers([], storage), /Unexpected write/);
});

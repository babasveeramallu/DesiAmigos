import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {runInNewContext} from 'node:vm';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<script id="theme-init">([\s\S]*?)<\/script>/)[1];

function initialize(saved, prefersDark, storageError){
  const dataset = {};
  const warnings = [];
  runInNewContext(bootstrap, {
    window: {matchMedia: () => ({matches: prefersDark})},
    localStorage: {getItem: key => {
      assert.equal(key, 'safe-signal-theme');
      if (storageError) throw storageError;
      return saved;
    }},
    document: {documentElement: {dataset}},
    console: {warn: (...args) => warnings.push(args)},
    DOMException,
  });
  return {theme: dataset.theme, warnings};
}

for (const [saved, prefersDark, expected] of [
  [null, false, 'light'], [null, true, 'dark'],
  ['light', true, 'light'], ['dark', false, 'dark'],
]){
  test(`initial theme: stored=${saved}, system dark=${prefersDark}`, () => {
    const result = initialize(saved, prefersDark);
    assert.equal(result.theme, expected);
    assert.equal(result.warnings.length, 0);
  });
}

test('invalid saved preference is reported and uses device appearance', () => {
  const result = initialize('unexpected', true);
  assert.equal(result.theme, 'dark');
  assert.equal(result.warnings.length, 1);
});

test('blocked storage does not prevent rendering', () => {
  const result = initialize(null, false, new DOMException('Blocked', 'SecurityError'));
  assert.equal(result.theme, 'light');
  assert.equal(result.warnings.length, 1);
});

test('unexpected initialization errors are not hidden', () => {
  assert.throws(() => initialize(null, false, new Error('Unexpected error')), /Unexpected error/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {estimateWarningLead, shouldEscalateWarning} from './callWarnings.js';

test('first signal cautions; second category escalates even after dismissal', () => {
  assert.equal(shouldEscalateWarning('low', 'uncertain'), true);
  assert.equal(shouldEscalateWarning('uncertain', 'high'), true);
  assert.equal(shouldEscalateWarning('low', 'high'), true);
  for (const [before, after] of [['low', 'low'], ['uncertain', 'uncertain'], ['high', 'high'], ['high', 'uncertain']]){
    assert.equal(shouldEscalateWarning(before, after), false);
  }
});

test('first caution can precede a later request without claiming measured latency', () => {
  const transcript = 'Your account will be locked. Tell me your one-time code.';
  const signals = [
    {label: 'Threat pressure', evidence: 'Your account will be locked'},
    {label: 'Verification-code request', evidence: 'Tell me your one-time code'},
  ];
  assert.ok(Math.abs(estimateWarningLead(transcript, signals, transcript.length, 26) - 3) < 1e-9);
  assert.ok(Math.abs(estimateWarningLead(transcript, signals, transcript.length, 31) + 2) < 1e-9);
  assert.equal(estimateWarningLead(transcript, signals.slice(0, 1), 10, 2), null);
  assert.equal(estimateWarningLead(transcript, signals, Infinity, 2), null);
});

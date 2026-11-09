import assert from 'node:assert/strict';
import test from 'node:test';
import {groupSampleEvents} from './sampleHandoff.js';

test('sample handoff groups finding and scope together as risky', () => {
  const events = [
    {id: 'action', kind: 'action'},
    {id: 'question', kind: 'question'},
    {id: 'finding', kind: 'finding'},
    {id: 'scope', kind: 'scope'},
    {id: 'message', kind: 'message'},
  ];
  const groups = groupSampleEvents(events);
  assert.deepEqual(groups.Done.map(event => event.id), ['action']);
  assert.deepEqual(groups.Open.map(event => event.id), ['question']);
  assert.deepEqual(groups.Risky.map(event => event.id), ['finding', 'scope']);
  assert.deepEqual(Object.values(groups).flat().map(event => event.id), [
    'action', 'question', 'finding', 'scope',
  ]);
});

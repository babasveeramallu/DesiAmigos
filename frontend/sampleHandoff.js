export const SAMPLE_HANDOFF_GROUPS = {
  Done: ['action'],
  Open: ['question'],
  Risky: ['finding', 'scope'],
};

export function groupSampleEvents(events){
  return Object.fromEntries(Object.entries(SAMPLE_HANDOFF_GROUPS).map(([group, kinds]) => [
    group,
    events.filter(event => kinds.includes(event.kind)),
  ]));
}

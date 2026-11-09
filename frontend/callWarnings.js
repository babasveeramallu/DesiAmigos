const RANK = {low: 0, uncertain: 1, high: 2};
const SECRET_REQUEST_LABELS = new Set(['Verification-code request', 'Credential request']);

export function shouldEscalateWarning(previous, current){
  return RANK[current] > RANK[previous];
}

export function estimateWarningLead(transcript, signals, duration, elapsed){
  const text = transcript.toLowerCase();
  const requestIndex = signals
    .filter(signal => SECRET_REQUEST_LABELS.has(signal.label))
    .map(signal => text.indexOf(signal.evidence.toLowerCase()))
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0];
  if (requestIndex === undefined || !Number.isFinite(duration) || duration <= 0) return null;
  return (requestIndex / transcript.length) * duration - elapsed;
}

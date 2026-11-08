import React from 'react';
import Markdown from 'react-markdown';

// Turns one lookup result from the back end into readable label/value rows
// instead of raw JSON. Unknown lookups still show, as simple rows.
function rowsFor(name, value){
  if (name === 'reputation') return [['Spam reports on file', String(value.reports ?? 'Unknown')]];
  if (name === 'identity') return [['Caller identity verified', value.verified ? 'Yes' : 'No']];
  if (name === 'evidence') return [
    ['Rule risk level', value.level || 'Unknown'],
    ['Signals found', value.signals?.length ? value.signals.map(signal => signal.label).join(', ') : 'None'],
    ['Method', value.method || 'Not stated'],
  ];
  if (value && typeof value === 'object') return Object.entries(value).filter(([key]) => key !== 'source').map(([key, item]) => [key, typeof item === 'object' ? JSON.stringify(item) : String(item)]);
  return [[name, String(value)]];
}

const TITLES = {reputation: 'Number reputation', identity: 'Caller identity', evidence: 'Transcript evidence'};

export default function InvestigationResult({result}){
  const fallback = /fallback|rules-only/i.test(result.mode || '');
  return <section className="verdict" aria-live="polite">
    <div className="verdicthead">
      <h2>Investigation</h2>
      <span className={'modebadge ' + (fallback ? 'fallback' : 'ai')}>{result.mode}</span>
    </div>
    {fallback && <p className="muted">The AI investigation was not used, so these are rule-based checks only.</p>}
    {/* skipHtml: any raw HTML in the model's answer is dropped, never rendered */}
    <div className="summary markdown"><Markdown skipHtml>{result.summary || ''}</Markdown></div>
    <div className="checks">
      {Object.entries(result.checks || {}).map(([name, value]) => <div key={name}>
        <strong>{TITLES[name] || name}</strong>
        <dl>{rowsFor(name, value).map(([label, text]) => <React.Fragment key={label}><dt>{label}</dt><dd>{text}</dd></React.Fragment>)}</dl>
        {value?.source && <span className="sourcetag">Source: {value.source}</span>}
      </div>)}
    </div>
    {result.steps?.length > 0 && <p className="muted">Lookups the agent used: {result.steps.join(' → ')}</p>}
  </section>;
}

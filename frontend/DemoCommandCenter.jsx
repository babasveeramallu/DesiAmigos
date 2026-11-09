import React, {useState} from 'react';
import {groupSampleEvents} from './sampleHandoff.js';

const SAMPLES = [
  {
    id: 'sample-bank', title: 'Bank verification attempt',
    events: [
      {id: 'bank-1', kind: 'finding', actor: 'Sample customer', body: 'Scenario: Bank account verification. Indicators: threat pressure, verification-code request, secrecy. No transcript or phone number shared.'},
      {id: 'bank-2', kind: 'action', actor: 'Sample responder', body: 'Advised the customer to end the call and contact the bank using its published number.'},
      {id: 'bank-3', kind: 'scope', actor: 'Sample responder', body: 'Scope note: one synthetic customer account. Exposure has not been confirmed.'},
      {id: 'bank-4', kind: 'question', actor: 'Sample responder', body: 'Did the customer share a code or approve a transfer before the warning?'},
    ],
  },
  {
    id: 'sample-support', title: 'Remote-support impersonation',
    events: [
      {id: 'support-1', kind: 'finding', actor: 'Sample customer', body: 'Scenario: Unexpected technical support. Indicators: remote-access request and gift-card payment.'},
      {id: 'support-2', kind: 'action', actor: 'Sample responder', body: 'Advised disconnecting any remote session and seeking support through the official provider.'},
      {id: 'support-3', kind: 'question', actor: 'Sample responder', body: 'Was remote-access software installed, and were any payment details shared?'},
      {id: 'support-4', kind: 'decision', actor: 'Sample responder', body: 'Keep the incident open until device access and financial exposure are checked.'},
    ],
  },
];

export default function DemoCommandCenter(){
  const [selected, setSelected] = useState(SAMPLES[0]);
  const [showBrief, setShowBrief] = useState(false);
  return <section aria-label="Read-only Command center demo">
    <div className="notice">
      <strong>Read-only demo / synthetic sample incidents / no key required</strong>
      <p>These authored examples are separate from stored reports. Nothing is submitted, no AI is called, and no live integrity check is performed.</p>
    </div>
    <div className="layout">
      <aside><h2>Sample incidents</h2>{SAMPLES.map(sample=><button
        key={sample.id} className={'scenario '+(sample.id===selected.id?'current':'')}
        onClick={()=>{setSelected(sample);setShowBrief(false);}}>
        <span>Synthetic sample</span><strong>{sample.title}</strong>
      </button>)}</aside>
      <section className="content">
        <div className="sectiontitle"><h2>Sample response timeline</h2><span className="risk uncertain">Read-only sample</span></div>
        <h3>{selected.title}</h3>
        <div className="timeline">{selected.events.map(event=><article key={event.id}>
          <div><span className="eventkind">{event.kind}</span></div>
          <p>{event.body}</p><small>{event.actor} / sample source {event.id}</small>
        </article>)}</div>
        <button onClick={()=>setShowBrief(value=>!value)} aria-expanded={showBrief} aria-controls="sample-handoff">
          {showBrief?'Hide sample handoff':'Preview sample handoff'}
        </button>
        {showBrief&&<section className="verdict" id="sample-handoff">
          <h2>Sample shift handoff</h2>
          <p>Deterministic grouping of the authored events, not an AI-generated brief.</p>
          {Object.entries(groupSampleEvents(selected.events)).map(([title,events])=><div key={title}>
            <h3>{title}</h3>{events.map(event=><p key={event.id}>
              {event.body} <small>[{event.id}]</small>
            </p>)}
          </div>)}
        </section>}
      </section>
    </div>
  </section>;
}

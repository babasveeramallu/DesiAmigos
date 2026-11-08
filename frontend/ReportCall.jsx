import React, {useRef, useState} from 'react';
import {Flag} from 'lucide-react';

export default function ReportCall({scenario, api, headingRef, onOpenIncident}){
  const [consent, setConsent] = useState(false);
  const [report, setReport] = useState({state: 'idle'});
  const submitting = useRef(false);

  async function submit(){
    if (submitting.current || report.state === 'success') return;
    if (!consent){
      setReport({state: 'error', message: 'Allow sharing the scenario title and risk labels before submitting.'});
      return;
    }
    submitting.current = true;
    setReport({state: 'submitting'});
    try{
      const result = await api('/escalate', {
        method: 'POST',
        body: JSON.stringify({scenario_id: scenario.id, consent}),
      });
      setReport({state: 'success', incident: result.incident});
      setConsent(false);
    }catch(error){
      setReport({state: 'error', message: error.message});
    }finally{
      submitting.current = false;
    }
  }

  return <section className="report-call" aria-labelledby="report-call-heading">
    <h2 id="report-call-heading" ref={headingRef} tabIndex={-1}>Report this demo call</h2>
    <p>Report <strong>{scenario.title}</strong> to Safe Signal's Command center. This does not contact a carrier, police, or other external organization.</p>
    <p className="muted">Only this selected demo scenario is reported, not live microphone input. A <a href="#presenter-access">presenter access key</a> is required. NVIDIA investigation is not required.</p>
    <label><input type="checkbox" checked={consent} disabled={report.state==='submitting'||report.state==='success'} onChange={event=>setConsent(event.target.checked)}/> Share only the scenario title and risk labels with responders. No transcript or phone number.</label>
    <button disabled={!consent||report.state==='submitting'||report.state==='success'} onClick={submit}><Flag size={17}/>{report.state==='submitting'?'Submitting report...':report.state==='success'?'Report submitted':'Submit report'}</button>
    {report.state==='error'&&<p className="error" role="alert">{report.message}</p>}
    {report.state==='success'&&<div className="notice">
      <p role="status">Report submitted. Incident {report.incident} created in Command center.</p>
      <button onClick={()=>onOpenIncident(report.incident)}>Open reported incident</button>
    </div>}
  </section>;
}

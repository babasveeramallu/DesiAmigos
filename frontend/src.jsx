import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ShieldCheck, Phone, Radio, Search, ArrowUpRight, Send, RefreshCw, LockKeyhole, Sun, Moon} from 'lucide-react';
import CallScreen from './CallScreen.jsx';
import InvestigationResult from './InvestigationResult.jsx';
import ReportCall from './ReportCall.jsx';
import DemoCommandCenter from './DemoCommandCenter.jsx';
import {loadBlockedCallers, saveBlockedCallers} from './blockedCallers.js';
import './style.css';

const INVESTIGATION_TIMEOUT_MS = 90000;

function App(){
 const [responseMode,setResponseMode]=useState('demo');
 const [blocks,setBlocks]=useState(()=>loadBlockedCallers());
 const reportHeading=useRef(null);
 function toggleBlockedCaller(caller){
  const callers=blocks.callers.includes(caller)?blocks.callers.filter(item=>item!==caller):[...blocks.callers,caller];
  setBlocks({callers,notice:saveBlockedCallers(callers)});
 }
 function showReport(){
  reportHeading.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
  reportHeading.current?.focus({preventScroll:true});
 }
 const [theme,setTheme]=useState(()=>document.documentElement.dataset.theme),[themeNotice,setThemeNotice]=useState('');
 function toggleTheme(){
  const next=theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=next;
  setTheme(next);setThemeNotice('');
  try{localStorage.setItem('safe-signal-theme',next);}
  catch(error){
   if(!(error instanceof DOMException))throw error;
   console.warn('Theme preference could not be saved.',error.name);
   setThemeNotice('Theme applied for this visit, but could not be saved in this browser.');
  }
 }
 const [view,setView]=useState('protect'),[scenarios,setScenarios]=useState([]),[selected,setSelected]=useState(null),[health,setHealth]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[cloud,setCloud]=useState(false),[token,setToken]=useState(''),[incidents,setIncidents]=useState([]),[active,setActive]=useState(null),[body,setBody]=useState(''),[kind,setKind]=useState('action'),[brief,setBrief]=useState(null),[clips,setClips]=useState({}),[investigation,setInvestigation]=useState({state:'idle',message:''}),[custom,setCustom]=useState(''),[customResult,setCustomResult]=useState(null);
 async function api(path,options={}){
  const protectedRequest=path==='/investigate'||path==='/escalate'||path.startsWith('/incidents');
  if(protectedRequest&&!token.trim())throw Error('Enter the presenter access key to use hosted investigation and responder features.');
  const response=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...(protectedRequest?{Authorization:'Bearer '+token}:{}),...options.headers}});
  let data=null;try{data=await response.json();}catch{data=null;}
  // An empty reply usually means the back end isn't running.
  if(data===null)throw Error(response.ok?'The back end sent an unreadable reply.':'Cannot reach the Safe Signal back end. Make sure it is running on port 8000.');
  if(!response.ok)throw Error(typeof data.detail==='string'?data.detail:'Request failed');
  return data;
 }
 async function perform(work){setBusy(true);setError('');try{await work();}catch(err){setError(err.message);}finally{setBusy(false);}}
 useEffect(()=>{
  perform(async()=>{const items=await api('/scenarios');setScenarios(items);setSelected(items[0]);setHealth(await api('/health'));});
  // Recorded call clips are optional; without them the call uses browser speech.
  fetch('/audio/clips.json').then(response=>response.ok?response.json():{}).then(setClips).catch(()=>setClips({}));
 },[]);
 async function refresh(incidentId){
  const items=await api('/incidents');
  const target=items.find(item=>item.id===(incidentId||active?.id));
  if(incidentId&&!target)throw Error('This report is no longer available. Demo incidents may be cleared when the server restarts.');
  setIncidents(items);
  if(incidentId||active)setActive(target||null);
  if(incidentId)setBrief(null);
 }
 async function investigate(){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),INVESTIGATION_TIMEOUT_MS);
  setResult(null);setInvestigation({state:'loading',message:''});
  try{
   const data=await api('/investigate',{method:'POST',body:JSON.stringify({scenario_id:selected.id,consent:cloud}),signal:controller.signal});
   setResult(data);setInvestigation({state:'done',message:''});
   setHealth(current=>({...current,ai:data.mode}));
  }catch(err){
   setInvestigation(err.name==='AbortError'?{state:'timeout',message:'The investigation took too long and was stopped. You can try again.'}:{state:'error',message:err.message});
  }finally{clearTimeout(timer);}
 }
 function chooseScenario(item){setSelected(item);setResult(null);setCloud(false);setInvestigation({state:'idle',message:''});}
 return <><header><a className="brand" href="/" aria-label="Safe Signal home"><ShieldCheck/> Safe Signal</a><nav><button className={view==='protect'?'selected':''} onClick={()=>setView('protect')}><Phone size={17}/>Protection</button><button className={view==='response'?'selected':''} onClick={()=>setView('response')}><Radio size={17}/>Command center</button></nav><button className="theme-toggle" onClick={toggleTheme} aria-label={'Switch to '+(theme==='dark'?'light':'dark')+' theme'}>{theme==='dark'?<Sun size={17} aria-hidden="true"/>:<Moon size={17} aria-hidden="true"/>}{theme==='dark'?'Light':'Dark'}</button></header>
 {themeNotice&&<p className="theme-notice" role="status">{themeNotice}</p>}
 {view==='protect'&&<div className="public-access" id="presenter-access"><p>No key needed for calls, message checks, or the <button className="secondary" onClick={()=>{setResponseMode('demo');setView('response');}}>Read-only Command center demo</button></p><div className="access"><LockKeyhole size={18}/><input type="password" autoComplete="off" value={token} onChange={event=>setToken(event.target.value)} placeholder="Optional key for hosted AI and real reports" aria-label="Presenter access key"/></div><p className="muted">Only hosted investigation, report submission, and stored responder incidents require a key. Kept in memory only. Hosted investigations are limited to 5 per 10 minutes per IP.</p></div>}
 {view==='protect'&&<section className="hero">
  <div className="heroinner">
   <h1>Warn people <em>while</em> the scam call is still happening</h1>
   <p>A concept for a carrier-side, in-call warning. This prototype plays synthetic calls and offers optional browser speech-to-text. A simple rule baseline checks transcript phrases only; voice characteristics are not assessed.</p>
   <div className="environment"><span className="status"><i/>{health.ai||'Connecting'}</span><span>{health.database}</span><span>{health.lookups}</span><span>Prototype · not carrier-integrated</span></div>
  </div>
  <a className="herocard" href="#demo"><small>Live demo</small><strong>Answer a synthetic scam call and watch the warning appear</strong><span className="herocardbutton">Try a call <ArrowUpRight size={16}/></span></a>
 </section>}
 <main>{view==='response'&&<><div className="heading"><div><div className="eyebrow">INCIDENT OPERATIONS</div><h1>Keep the response <em>moving</em>.</h1></div><span className="status"><i/>{health.ai||'Connecting'}</span></div>
 <div className="environment"><span>{health.database}</span><span>{health.lookups}</span><span>Prototype · not carrier-integrated</span></div></>}
 {error&&<div role="alert" className="error">{error}</div>}
 {view==='protect'&&selected&&<div className="layout" id="demo"><aside><h2>Scenarios</h2>{scenarios.map(item=><button key={item.id} className={'scenario '+(selected.id===item.id?'current':'')} onClick={()=>chooseScenario(item)}><span>{item.category}</span><strong>{item.title}</strong>{blocks.callers.includes(item.caller)&&<small>Blocked in this browser</small>}<ArrowUpRight size={18}/></button>)}<p className="muted">All identities and messages are synthetic. Calls are played in the browser, not intercepted from a real phone line.</p></aside><section className="content"><div className="sectiontitle"><h2>{selected.title}</h2><span className={'risk '+selected.assessment.level}>{selected.assessment.level} risk (rules)</span></div>
 <CallScreen key={selected.id} scenario={selected} clip={clips[selected.id]} scoreText={text=>api('/score',{method:'POST',body:JSON.stringify({text})})} blocked={blocks.callers.includes(selected.caller)} blockNotice={blocks.notice} onToggleBlock={()=>toggleBlockedCaller(selected.caller)} onReport={showReport}/>
 <div className="evidence"><h2>Evidence, not assumptions</h2>{selected.assessment.signals.length?selected.assessment.signals.map(signal=><div className="signal" key={signal.label}><strong>{signal.label}</strong><q>{signal.evidence}</q></div>):<p>No baseline scam indicators found. This does not prove a call is safe.</p>}<small>{selected.assessment.method}</small></div><section className="evidence"><h2>Try your own message</h2><p className="muted">Checked locally with transcript rules only. This text is not sent to NVIDIA.</p><textarea value={custom} maxLength={1000} onChange={event=>{setCustom(event.target.value);setCustomResult(null);}} placeholder="Type or paste a scam-style message"/><button disabled={!custom.trim()||busy} onClick={()=>perform(async()=>setCustomResult(await api('/score',{method:'POST',body:JSON.stringify({text:custom})})))}><Search size={16}/>Check message</button>{customResult&&<div><span className={'risk '+customResult.level}>{customResult.level} risk (rules)</span>{customResult.signals.length?customResult.signals.map(signal=><div className="signal" key={signal.label}><strong>{signal.label}</strong><q>{signal.evidence}</q></div>):<p className="muted">No matching baseline phrases. That does not prove this message is safe.</p>}<small>{customResult.method}</small></div>}</section><div className="actions"><label><input type="checkbox" checked={cloud} onChange={event=>setCloud(event.target.checked)}/> Allow this synthetic transcript to be sent to NVIDIA for investigation.</label><button disabled={!cloud||investigation.state==='loading'} onClick={investigate}><Search size={17}/>{investigation.state==='loading'?'Investigating…':'Investigate'}</button></div>
 {investigation.state==='loading'&&<div className="investigating" role="status"><span className="spinner"/>Checking the caller with synthetic lookups. With Nemotron configured this can take up to a minute.</div>}
 {(investigation.state==='timeout'||investigation.state==='error')&&<div role="alert" className="error">{investigation.message}</div>}
 {result&&<InvestigationResult result={result}/>}<section className="recovery"><h2>Already shared something?</h2><details><summary>A verification code or password</summary><p>Open the official service directly. Change the password, revoke unknown sessions, and contact its fraud team using a published number.</p></details><details><summary>Money or remote device access</summary><p>Contact your bank immediately about payment recovery. Disconnect a remotely accessed device and seek trusted technical support.</p></details></section>
 <ReportCall key={'report-'+selected.id} scenario={selected} api={api} headingRef={reportHeading} onOpenIncident={id=>perform(async()=>{await refresh(id);setResponseMode('live');setView('response');})}/>
 </section></div>}
 {view==='response'&&<div className="callmodes" role="group" aria-label="Command center mode">
  <button className={responseMode==='demo'?'selected':''} onClick={()=>{setResponseMode('demo');setError('');}}>Read-only demo (no key)</button>
  <button className={responseMode==='live'?'selected':''} onClick={()=>{setResponseMode('live');setError('');}}>Stored reports (key required)</button>
 </div>}
 {view==='response'&&responseMode==='demo'&&<DemoCommandCenter/>}
 {view==='response'&&responseMode==='live'&&<><div className="access"><LockKeyhole size={18}/><input type="password" autoComplete="off" value={token} onChange={event=>setToken(event.target.value)} placeholder="Local responder access token" aria-label="Responder access token"/><button disabled={busy} onClick={()=>perform(refresh)}><RefreshCw size={16}/>Connect / refresh</button></div><p className="muted">Prototype access uses one shared responder token, kept in memory. Individual accounts, admin enrollment, and MFA are not implemented.</p><div className="layout"><aside><h2>Incidents <span className="count">{incidents.length}</span></h2>{incidents.map(item=><button className={'scenario '+(active?.id===item.id?'current':'')} key={item.id} onClick={()=>{setActive(item);setBrief(null);}}><span>{item.verified?'Chain verified':'Integrity failure'}</span><strong>{item.id}</strong></button>)}{!incidents.length&&<p className="muted">Connect to view incidents. Report a demo call from Protection to create one.</p>}</aside><section className="content">{active?<><div className="sectiontitle"><h2>Response timeline</h2><span className={'risk '+(active.verified?'low':'high')}>{active.verified?'Integrity verified':'Tampering detected'}</span></div><div className="timeline">{active.events.map(event=><article key={event.id}><div><span className="eventkind">{event.kind}</span><time>{new Date(event.created).toLocaleString()}</time></div><p>{event.body}</p><small>{event.actor} · source {event.id.slice(0,8)}</small></article>)}</div><form onSubmit={event=>{event.preventDefault();perform(async()=>{await api('/incidents/'+active.id+'/events',{method:'POST',body:JSON.stringify({body,kind})});setBody('');await refresh();});}}><label>Entry type<select value={kind} onChange={event=>setKind(event.target.value)}>{['action','finding','question','decision','message','scope','ack'].map(value=><option key={value}>{value}</option>)}</select></label><label>Incident update<textarea required maxLength={2000} value={body} onChange={event=>setBody(event.target.value)} placeholder="Record an action, scope update, or responder message"/></label><button disabled={busy}><Send size={16}/>Append entry</button></form><button className="secondary" disabled={busy} onClick={()=>perform(async()=>setBrief(await api('/incidents/'+active.id+'/brief')))}>Generate handoff</button>{brief&&<section className="verdict"><h2>Shift handoff</h2>{['done','open','risky'].map(group=><div key={group}><h3>{group}</h3>{brief[group].length?brief[group].map(event=><p key={event.id}>{event.body} <small>[{event.id.slice(0,8)}]</small></p>):<p className="muted">No entries recorded.</p>}</div>)}<p>{brief.next}</p><small>Head: {brief.head}</small></section>}</>:<div className="empty"><Radio size={42}/><h2>Select an incident</h2></div>}</section></div></>}
 </main><footer>Safe Signal / DesiAmigos <span>Customer consent → evidence → coordinated response</span></footer></>;
}
createRoot(document.getElementById('root')).render(<App/>);
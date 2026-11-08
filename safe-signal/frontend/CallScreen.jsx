import React, {useEffect, useRef, useState} from 'react';
import {PhoneOff, Play, Square, VolumeX, ShieldAlert, ShieldCheck, Mic, RotateCcw, Signal, Wifi, BatteryFull, Radar} from 'lucide-react';

// Same rule the back end uses: 2+ signals = high, 1 = uncertain, 0 = low.
function levelFor(count){return count >= 2 ? 'high' : count === 1 ? 'uncertain' : 'low';}
const LEVEL_TEXT = {low: 'No signals yet', uncertain: 'Suspicious', high: 'Scam Likely'};
const LOWERED_VOLUME = 0.2;

function clock(seconds){
  const s = Math.max(0, Math.floor(seconds || 0));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

// Phone-style screen that plays one synthetic call and shows the rule-based
// risk building up as the transcript is revealed.
function RoundButton({className, label, onClick, children}){
  return <div className="roundwrap"><button className={'round ' + className} onClick={onClick} aria-label={label}>{children}</button><span>{label}</span></div>;
}

export default function CallScreen({scenario, clip}){
  const [status, setStatus] = useState('idle'); // idle | playing | ended | hungup | declined
  const [revealed, setRevealed] = useState(0); // characters of transcript shown
  const [elapsed, setElapsed] = useState(0);
  const [source, setSource] = useState(clip ? 'clip' : 'speech');
  const [problem, setProblem] = useState('');
  const [warningOpen, setWarningOpen] = useState(false);
  const [lowered, setLowered] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const warnedRef = useRef(false);
  const bubblesRef = useRef(null);
  const runRef = useRef(0); // ignores events from a call that was already stopped

  const transcript = scenario.transcript;
  const shownText = transcript.slice(0, revealed);
  const found = scenario.assessment.signals.filter(signal => shownText.toLowerCase().includes(signal.evidence.toLowerCase()));
  const level = status === 'idle' ? 'low' : levelFor(found.length);

  function cleanup(){
    runRef.current += 1;
    clearInterval(timerRef.current);
    if (audioRef.current){audioRef.current.pause(); audioRef.current.onerror = null; audioRef.current = null;}
    window.speechSynthesis?.cancel();
  }
  useEffect(() => cleanup, []);
  // Keep the newest words in view.
  useEffect(() => {const box = bubblesRef.current; if (box) box.scrollTop = box.scrollHeight;}, [revealed]);

  // Show the private warning and lower the caller once the risk turns high.
  useEffect(() => {
    if (status === 'playing' && level === 'high' && !warnedRef.current){
      warnedRef.current = true;
      setWarningOpen(true);
      if (audioRef.current){audioRef.current.volume = LOWERED_VOLUME; setLowered(true);}
    }
  }, [status, level]);

  function reset(){warnedRef.current = false; setWarningOpen(false); setLowered(false); setRevealed(0); setElapsed(0); setProblem('');}

  function playSpeech(){
    if (!window.speechSynthesis){setProblem('This browser cannot play audio for this call.'); setStatus('idle'); return;}
    setSource('speech');
    const run = runRef.current;
    const live = () => run === runRef.current;
    const started = Date.now();
    const utterance = new SpeechSynthesisUtterance(transcript);
    let boundaries = false;
    utterance.onboundary = event => {if (!live()) return; boundaries = true; setRevealed(Math.max(event.charIndex, 0) + (event.charLength || 1));};
    utterance.onend = () => {if (!live()) return; clearInterval(timerRef.current); setRevealed(transcript.length); setStatus('ended');};
    utterance.onerror = () => {if (!live()) return; clearInterval(timerRef.current); setStatus('ended');};
    // Some browsers don't report word positions, so estimate ~15 characters a second.
    timerRef.current = setInterval(() => {
      const seconds = (Date.now() - started) / 1000;
      setElapsed(seconds);
      if (!boundaries) setRevealed(Math.min(transcript.length, Math.round(seconds * 15)));
    }, 200);
    window.speechSynthesis.speak(utterance);
  }

  function play(){
    cleanup(); reset(); setStatus('playing');
    if (!clip){playSpeech(); return;}
    setSource('clip');
    const audio = new Audio('/audio/' + clip.file);
    audioRef.current = audio;
    audio.ontimeupdate = () => {
      setElapsed(audio.currentTime);
      if (audio.duration) setRevealed(Math.round(transcript.length * audio.currentTime / audio.duration));
    };
    audio.onended = () => {setRevealed(transcript.length); setStatus('ended');};
    audio.onerror = () => {
      audioRef.current = null;
      setProblem('The recorded clip "' + clip.file + '" could not be played, so browser speech is used instead.');
      playSpeech();
    };
    audio.play().catch(() => {});
  }

  function stop(){cleanup(); setStatus('ended');}
  function hangUp(){cleanup(); setStatus('hungup');}
  function decline(){cleanup(); reset(); setStatus('declined');}

  const statusText = {idle: 'Incoming call', playing: 'On call · ' + clock(elapsed), ended: 'Call ended · ' + clock(elapsed), hungup: 'You hung up · ' + clock(elapsed), declined: 'Declined'}[status];
  const waiting = status === 'idle' || status === 'declined';
  const pillLevel = waiting ? 'idle' : level;
  const pillText = waiting ? 'Safe Signal on' : LEVEL_TEXT[level];
  // Split what has been said so far into sentence bubbles.
  const bubbles = shownText.match(/[^.!?]+[.!?]*/g)?.map(text => text.trim()).filter(Boolean) || [];
  const signalCount = found.length;

  return <div className="callgrid">
    <div className={'phone ' + (level === 'high' && status !== 'idle' ? 'alarm' : '')} aria-label="Simulated phone call">
      <div className="statusbar"><span>9:41</span><div className="notch"/><span className="statusicons"><Signal size={14}/><Wifi size={14}/><BatteryFull size={16}/></span></div>
      <div className="pills">
        <span className={'statuspill ' + pillLevel}><ShieldAlert size={13}/>{pillText}</span>
        {lowered && status === 'playing' && <span className="statuspill muted"><VolumeX size={13}/>Lowered</span>}
      </div>
      <div className="caller">
        <div className="avatar">?</div>
        <strong>Unknown Caller</strong>
        <span className="number">{scenario.caller}</span>
        <span className={'callstate ' + status}>{statusText}</span>
      </div>

      {warningOpen && <div className="warning" role="alert">
        <div className="warninglabel"><ShieldAlert size={14}/>Private alert · only you see this</div>
        <strong>{status === 'playing' ? 'This call appears to be Scam Likely. Hang up.' : 'This call was flagged as Scam Likely.'}</strong>
        {lowered && status === 'playing' && <span className="lowered"><VolumeX size={14}/> Caller volume lowered</span>}
        {status !== 'playing' && <small>Don't call back. Use the official number to contact your bank or provider.</small>}
        {status === 'playing' && <div className="warningactions">
          <button className="dark" onClick={hangUp}><PhoneOff size={16}/>Hang up</button>
          <button className="ghost" onClick={() => setWarningOpen(false)}>Keep listening</button>
        </div>}
      </div>}

      <div className="livetranscript" aria-live="polite">
        <div className="transcripthead">Live transcript</div>
        <div className="bubbles" ref={bubblesRef}>
          {waiting ? <p className="placeholder center">Press Answer to start. Safe Signal will show the words and check the call as it plays.</p>
            : bubbles.length ? bubbles.map((text, index) => <div className="bubble" key={index}><small>Caller</small><p>{text}</p></div>)
            : <p className="placeholder">Listening…</p>}
        </div>
      </div>

      <div className="phonecontrols">
        {status === 'playing' && <><RoundButton className="danger" label="Hang up" onClick={hangUp}><PhoneOff size={24}/></RoundButton><RoundButton className="darkround" label="Stop" onClick={stop}><Square size={20}/></RoundButton></>}
        {waiting && <><RoundButton className="danger" label="Decline" onClick={decline}><PhoneOff size={24}/></RoundButton><RoundButton className="answer" label="Answer" onClick={play}><Play size={24}/></RoundButton></>}
        {(status === 'ended' || status === 'hungup') && <button className="pillbutton" onClick={play}><RotateCcw size={18}/>Replay call</button>}
      </div>
    </div>

    <div className="livepanel">
      <h2 className="paneltitle"><i className={pillLevel}/>Live risk</h2>
      <div className="label">Current assessment</div>
      <p className={'bigword ' + pillLevel}>{waiting ? 'Waiting…' : LEVEL_TEXT[level]}</p>
      <div className="meter" role="meter" aria-label="Risk level" aria-valuetext={waiting ? 'Waiting' : LEVEL_TEXT[level]}>
        <span className={'safe ' + (!waiting ? 'on' : '')}/><span className={'sus ' + (!waiting && level !== 'low' ? 'on' : '')}/><span className={'scam ' + (!waiting && level === 'high' ? 'on' : '')}/>
      </div>
      <div className={'meterlabels ' + pillLevel}><span>Safe</span><span>Suspicious</span><span>Scam Likely</span></div>

      <div className="label signalshead"><span>Detected signals</span><span>{signalCount}</span></div>
      {found.length ? <ul className="foundlist">{found.map(signal => <li key={signal.label}>
          <div className="signalicon"><ShieldAlert size={18}/></div>
          <div><strong>{signal.label}</strong><small>Heard: “{signal.evidence}”</small></div>
        </li>)}</ul>
        : waiting ? <div className="emptysignal dashed"><Radar size={18}/><span>Answer the call to start analysis.</span></div>
        : <div className="emptysignal"><div className="signalicon ok"><ShieldCheck size={18}/></div><div><strong>No scam phrases heard</strong><small>This does not prove the call is safe.</small></div></div>}
      {problem && <p className="playproblem" role="status">{problem}</p>}
      <div className="provenance">
        <Mic size={14}/>
        <small>{source === 'clip' && clip ? <>Audio: {clip.provenance}</> : <>Audio: browser text-to-speech reading the synthetic script. No recorded clip yet.</>}</small>
      </div>
      <div className="provenance"><ShieldCheck size={14}/><small>Signals come from rule-based checks on the transcript. Audio is not analyzed for synthetic voices yet.</small></div>
    </div>
  </div>;
}

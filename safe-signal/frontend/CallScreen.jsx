import React, {useEffect, useRef, useState} from 'react';
import {Phone, PhoneOff, Play, Square, Volume1, ShieldAlert, Mic} from 'lucide-react';

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
export default function CallScreen({scenario, clip}){
  const [status, setStatus] = useState('idle'); // idle | playing | ended | hungup
  const [revealed, setRevealed] = useState(0); // characters of transcript shown
  const [elapsed, setElapsed] = useState(0);
  const [source, setSource] = useState(clip ? 'clip' : 'speech');
  const [problem, setProblem] = useState('');
  const [warningOpen, setWarningOpen] = useState(false);
  const [lowered, setLowered] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const warnedRef = useRef(false);
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
  function hangUp(){cleanup(); setWarningOpen(false); setStatus('hungup');}

  const statusText = {idle: 'Incoming call', playing: 'Call in progress · ' + clock(elapsed), ended: 'Call ended', hungup: 'You hung up'}[status];

  return <div className="callgrid">
    <div className={'phone ' + (level === 'high' && status !== 'idle' ? 'alarm' : '')} aria-label="Simulated phone call">
      <div className="phonebar"><span>Safe Signal</span><span className={'livebadge ' + level}><ShieldAlert size={13}/>{LEVEL_TEXT[level]}</span></div>
      <div className="caller">
        <div className="avatar"><Phone size={26}/></div>
        <strong>{scenario.caller}</strong>
        <span>{statusText}</span>
      </div>

      {warningOpen && <div className="warning" role="alert">
        <ShieldAlert size={22}/>
        <strong>This call appears to be Scam Likely. Hang up.</strong>
        {lowered && <small><Volume1 size={14}/> Caller volume lowered</small>}
        <div className="warningactions">
          <button className="danger" onClick={hangUp}><PhoneOff size={16}/>Hang up</button>
          <button className="ghost" onClick={() => setWarningOpen(false)}>Keep listening</button>
        </div>
      </div>}

      <div className="livetranscript" aria-live="polite">
        <small>Live transcript</small>
        <p>{status === 'idle' ? <span className="placeholder">Press play to start the synthetic call.</span> : shownText || '…'}</p>
      </div>

      <div className="phonecontrols">
        {status === 'playing'
          ? <button className="danger round" onClick={hangUp} aria-label="Hang up"><PhoneOff size={22}/></button>
          : <button className="round" onClick={play} aria-label={status === 'idle' ? 'Play synthetic call' : 'Replay synthetic call'}><Play size={22}/></button>}
        {status === 'playing' && <button className="ghost" onClick={stop}><Square size={14}/>Stop</button>}
      </div>
    </div>

    <div className="livepanel">
      <h2>Live risk</h2>
      <div className={'meter ' + level} role="meter" aria-label="Risk level" aria-valuetext={LEVEL_TEXT[level]}>
        <span className={level !== 'low' || status !== 'idle' ? 'on' : ''}/><span className={level !== 'low' ? 'on' : ''}/><span className={level === 'high' ? 'on' : ''}/>
      </div>
      <p className="metertext">{status === 'idle' ? 'Waiting for the call to start.' : LEVEL_TEXT[level]}</p>
      <h3>Signals heard so far</h3>
      {found.length ? <ul className="foundlist">{found.map(signal => <li key={signal.label}><strong>{signal.label}</strong><q>{signal.evidence}</q></li>)}</ul>
        : <p className="muted">{status === 'idle' ? 'Nothing yet.' : 'No scam phrases heard yet. This does not prove the call is safe.'}</p>}
      <small>Signals come from rule-based checks on the transcript. Audio is not analyzed for synthetic voices yet.</small>
      {problem && <p className="playproblem" role="status">{problem}</p>}
      <div className="provenance">
        <Mic size={14}/>
        <small>{source === 'clip' && clip ? <>Audio: {clip.provenance}</> : <>Audio: browser text-to-speech reading the synthetic script. No recorded clip yet.</>}</small>
      </div>
    </div>
  </div>;
}

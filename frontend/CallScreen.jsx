import React, {useEffect, useRef, useState} from 'react';
import {PhoneOff, Play, Square, VolumeX, ShieldAlert, ShieldCheck, Mic, RotateCcw, Signal, Wifi, BatteryFull, Radar, Ban, Flag} from 'lucide-react';

// Same rule the back end uses: 2+ signals = high, 1 = uncertain, 0 = low.
function levelFor(count){return count >= 2 ? 'high' : count === 1 ? 'uncertain' : 'low';}
const LEVEL_TEXT = {low: 'No signals yet', uncertain: 'Suspicious', high: 'Scam Likely'};
const LOWERED_VOLUME = 0.2;
const SECRET_REQUEST_LABELS = new Set(['Verification-code request', 'Credential request']);
function clock(seconds){
  const s = Math.max(0, Math.floor(seconds || 0));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

// Phone-style screen that plays one synthetic call and shows the rule-based
// risk building up as the transcript is revealed.
function RoundButton({className, label, onClick, children}){
  return <div className="roundwrap"><button className={'round ' + className} onClick={onClick} aria-label={label}>{children}</button><span>{label}</span></div>;
}

export default function CallScreen({scenario, clip, scoreText, blocked, blockNotice, onToggleBlock, onReport}){
  const [status, setStatus] = useState('idle'); // idle | playing | ended | hungup | declined
  const [inputMode, setInputMode] = useState('scenario');
  const [revealed, setRevealed] = useState(0); // characters of transcript shown
  const [elapsed, setElapsed] = useState(0);
  const [source, setSource] = useState(clip ? 'clip' : 'speech');
  const [problem, setProblem] = useState('');
  const [warningOpen, setWarningOpen] = useState(false);
  const [lowered, setLowered] = useState(false);
  const [warningLeadSeconds, setWarningLeadSeconds] = useState(null);
  const [liveConsent, setLiveConsent] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const [liveStarting, setLiveStarting] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [liveAssessment, setLiveAssessment] = useState({level: 'low', signals: []});
  const [liveProblem, setLiveProblem] = useState('');
  const [familyAction, setFamilyAction] = useState('');
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const warnedRef = useRef(false);
  const bubblesRef = useRef(null);
  const runRef = useRef(0); // ignores events from a call that was already stopped
  const liveTranscriptRef = useRef('');
  const liveScoreRequestRef = useRef(0);

  const transcript = scenario.transcript;
  const isLiveMode = inputMode === 'live';
  const shownText = isLiveMode ? liveText : transcript.slice(0, revealed);
  const found = isLiveMode
    ? liveAssessment.signals
    : scenario.assessment.signals.filter(signal => shownText.toLowerCase().includes(signal.evidence.toLowerCase()));
  const waiting = isLiveMode ? !liveListening && !liveText : status === 'idle' || status === 'declined';
  const level = isLiveMode ? liveAssessment.level : status === 'idle' ? 'low' : levelFor(found.length);
  const callActive = isLiveMode ? liveListening : !blocked && status === 'playing';

  function cleanup(){
    runRef.current += 1;
    clearInterval(timerRef.current);
    if (audioRef.current){
      audioRef.current.pause();
      audioRef.current.onerror = null;
      audioRef.current.ontimeupdate = null;
      audioRef.current.onended = null;
      audioRef.current = null;
    }
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) recognition.abort();
    window.speechSynthesis?.cancel();
  }
  useEffect(() => () => cleanup(), []);
  // Keep the newest words in view.
  useEffect(() => {const box = bubblesRef.current; if (box) box.scrollTop = box.scrollHeight;}, [revealed]);

  // Show the private warning once the transcript reaches the high-risk threshold.
  useEffect(() => {
    if (callActive && level === 'high' && !warnedRef.current){
      warnedRef.current = true;
      setWarningOpen(true);
      setFamilyAction('');
      if (!isLiveMode){
        const loweredTranscript = transcript.toLowerCase();
        const requestIndex = scenario.assessment.signals
          .filter(signal => SECRET_REQUEST_LABELS.has(signal.label))
          .map(signal => loweredTranscript.indexOf(signal.evidence.toLowerCase()))
          .filter(index => index >= 0)
          .sort((a, b) => a - b)[0];
        const duration = Number.isFinite(audioRef.current?.duration)
          ? audioRef.current.duration
          : transcript.length / 15;
        if (requestIndex !== undefined && duration > 0){
          setWarningLeadSeconds((requestIndex / transcript.length) * duration - elapsed);
        }else{
          setWarningLeadSeconds(null);
        }
        if (audioRef.current){audioRef.current.volume = LOWERED_VOLUME; setLowered(true);}
      }else{
        setWarningLeadSeconds(null);
      }
    }
  }, [callActive, elapsed, isLiveMode, level, scenario.assessment.signals, transcript]);

  function reset(){
    warnedRef.current = false;
    setWarningOpen(false);
    setLowered(false);
    setWarningLeadSeconds(null);
    setFamilyAction('');
    setRevealed(0);
    setElapsed(0);
    setProblem('');
  }

  function selectInputMode(mode){
    cleanup();
    reset();
    setSource(mode === 'live' ? 'live' : clip ? 'clip' : 'speech');
    setStatus('idle');
    setLiveStarting(false);
    setLiveListening(false);
    setLiveText('');
    setLiveProblem('');
    setLiveAssessment({level: 'low', signals: []});
    liveTranscriptRef.current = '';
    liveScoreRequestRef.current += 1;
    setInputMode(mode);
  }

  function startLive(){
    if (!liveConsent){
      setLiveProblem('Consent to microphone access and browser speech transcription before starting.');
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition){
      setLiveProblem('Live transcription is unavailable in this browser. Try a current version of Chrome or Edge.');
      return;
    }
    setLiveProblem('');
    setSource('live');
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    let finalText = liveTranscriptRef.current;
    setLiveStarting(true);
    recognition.onstart = () => {
      setLiveStarting(false);
      setLiveListening(true);
    };
    recognition.onresult = event => {
      if (recognitionRef.current !== recognition) return;
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1){
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript + ' ';
        else interimText += result[0].transcript;
      }
      liveTranscriptRef.current = finalText;
      const currentText = (finalText + interimText).trim().slice(0, 1000);
      setLiveText(currentText);
      if (currentText){
        const requestId = ++liveScoreRequestRef.current;
        scoreText(currentText).then(assessment => {
          if (requestId === liveScoreRequestRef.current){
            setLiveAssessment(assessment);
            setLiveProblem('');
          }
        }).catch(error => {
          if (requestId === liveScoreRequestRef.current) setLiveProblem(error.message);
        });
      }
    };
    recognition.onerror = event => {
      if (recognitionRef.current !== recognition) return;
      if (event.error !== 'no-speech') setLiveProblem('Speech recognition error: ' + event.error);
      setLiveStarting(false);
      setLiveListening(false);
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition){
        recognitionRef.current = null;
        setLiveStarting(false);
        setLiveListening(false);
      }
    };
    try{
      recognition.start();
    }catch(error){
      recognitionRef.current = null;
      setLiveStarting(false);
      setLiveProblem('Could not start microphone transcription: ' + error.message);
    }
  }

  function stopLive(){
    const recognition = recognitionRef.current;
    if (recognition){
      recognitionRef.current = null;
      recognition.stop();
    }
    setLiveStarting(false);
    setLiveListening(false);
  }

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
    if (blocked){setProblem('Unblock this demo caller before playing its call.'); return;}
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
  function toggleBlock(){
    cleanup(); reset(); setStatus('idle');
    onToggleBlock();
  }

  const statusText = isLiveMode
    ? liveListening ? 'Live · listening' : liveText ? 'Live · paused' : 'Live microphone ready'
    : blocked ? 'Blocked in this browser' : {idle: 'Incoming call', playing: 'On call · ' + clock(elapsed), ended: 'Call ended · ' + clock(elapsed), hungup: 'You hung up · ' + clock(elapsed), declined: 'Declined'}[status];
  const pillLevel = waiting ? 'idle' : level;
  const pillText = !isLiveMode && blocked ? 'Demo caller blocked' : waiting ? 'Safe Signal on' : LEVEL_TEXT[level];
  // Split what has been said so far into sentence bubbles.
  const bubbles = shownText.match(/[^.!?]+[.!?]*/g)?.map(text => text.trim()).filter(Boolean) || [];
  const signalCount = found.length;

  return <>
  <div className="callmodes" role="group" aria-label="Call demo mode">
    <button className={!isLiveMode ? 'selected' : ''} onClick={() => selectInputMode('scenario')}>Synthetic scenario</button>
    <button className={isLiveMode ? 'selected' : ''} onClick={() => selectInputMode('live')}><Mic size={16}/>Live microphone</button>
  </div>
  <div className="callgrid">
    <div className={'phone ' + (level === 'high' && !waiting ? 'alarm' : '')} aria-label={isLiveMode ? 'Live microphone transcript demo' : 'Simulated phone call'}>
      <div className="statusbar"><span>9:41</span><div className="notch"/><span className="statusicons"><Signal size={14}/><Wifi size={14}/><BatteryFull size={16}/></span></div>
      <div className="pills">
        <span className={'statuspill ' + pillLevel}><ShieldAlert size={13}/>{pillText}</span>
        {lowered && callActive && <span className="statuspill muted"><VolumeX size={13}/>Lowered</span>}
      </div>
      <div className="caller">
        <div className="avatar">?</div>
        <strong>Unknown Caller</strong>
        <span className="number">{scenario.caller}</span>
        <span className={'callstate ' + (callActive ? 'playing' : status)}>{statusText}</span>
      </div>

      {warningOpen && <div className="warning" role="alert">
        <div className="warninglabel"><ShieldAlert size={14}/>Private alert · only you see this</div>
        <strong>{callActive ? 'This call appears to be Scam Likely. Hang up.' : 'This call was flagged as Scam Likely.'}</strong>
        {warningLeadSeconds !== null && <small className="warningtiming">{warningLeadSeconds >= 0
          ? `Approx. ${warningLeadSeconds.toFixed(1)}s before the code request · playback estimate`
          : `Approx. ${Math.abs(warningLeadSeconds).toFixed(1)}s after the code request · playback estimate`}</small>}
        {lowered && callActive && <span className="lowered"><VolumeX size={14}/> Caller recording volume lowered</span>}
        {!callActive && <small>Don't call back. Use the official number to contact your bank or provider.</small>}
        {callActive && <div className="warningactions">
          {!isLiveMode && <button className="dark" onClick={hangUp}><PhoneOff size={16}/>Hang up</button>}
          {isLiveMode && <button className="dark" onClick={stopLive}><PhoneOff size={16}/>Stop listening</button>}
          <button className="ghost" onClick={() => setWarningOpen(false)}>Keep listening</button>
          <button className="ghost" onClick={() => setFamilyAction('Ask the caller to say your agreed family code word. Do not tell them the word first.')}>Ask for our family code word</button>
          <button className="ghost" onClick={() => setFamilyAction('Simulation only: trusted-contact alert preview — “I may be on a suspicious call. Please call me directly.” No message was sent.')}>Preview trusted-contact alert</button>
        </div>}
        {familyAction && <small className="familyaction" role="status">{familyAction}</small>}
      </div>}

      <div className="livetranscript" aria-live="polite">
        <div className="transcripthead">Live transcript</div>
        <div className="bubbles" ref={bubblesRef}>
          {!isLiveMode && blocked ? <p className="placeholder center">Playback is blocked for this demo caller. Unblock below to answer again.</p> : waiting ? <p className="placeholder center">{isLiveMode ? 'Give microphone access, then start listening and speak a sample message.' : 'Press Answer to start. Safe Signal will show the words and check the call as it plays.'}</p>
            : bubbles.length ? bubbles.map((text, index) => <div className="bubble" key={index}><small>Caller</small><p>{text}</p></div>)
            : <p className="placeholder">Listening…</p>}
        </div>
      </div>

      <div className="phonecontrols">
        {!isLiveMode && !blocked && status === 'playing' && <><RoundButton className="danger" label="Hang up" onClick={hangUp}><PhoneOff size={24}/></RoundButton><RoundButton className="darkround" label="Stop" onClick={stop}><Square size={20}/></RoundButton></>}
        {!isLiveMode && !blocked && waiting && <><RoundButton className="danger" label="Decline" onClick={decline}><PhoneOff size={24}/></RoundButton><RoundButton className="answer" label="Answer" onClick={play}><Play size={24}/></RoundButton></>}
        {!isLiveMode && !blocked && (status === 'ended' || status === 'hungup') && <button className="pillbutton" onClick={play}><RotateCcw size={18}/>Replay call</button>}
        {isLiveMode && <button className="pillbutton" onClick={liveListening ? stopLive : startLive} disabled={liveStarting || (!liveConsent && !liveListening)}>{liveListening ? 'Stop listening' : liveStarting ? 'Starting microphone…' : liveText ? 'Continue listening' : 'Start microphone'}</button>}
      </div>
      {!isLiveMode && <div className="caller-actions">
        <button className="ghost" onClick={toggleBlock}><Ban size={16}/>{blocked?'Unblock demo caller':'Block demo caller'}</button>
        <button className="ghost" onClick={onReport}><Flag size={16}/>Report this call</button>
        <p>Blocks only this demo caller in this browser, not real phone calls.</p>
        {blocked && <p role="status">Caller blocked. Unblock any time to resume demo playback.</p>}
        {blockNotice && <p className="playproblem" role="status">{blockNotice}</p>}
      </div>}
    </div>

    <div className="livepanel">
      <h2 className="paneltitle"><i className={pillLevel}/>Live risk</h2>
      {isLiveMode && <section className="live-mic-controls">
        <label><input type="checkbox" checked={liveConsent} onChange={event => {
          setLiveConsent(event.target.checked);
          if (!event.target.checked) stopLive();
        }}/>I consent to microphone access and browser speech transcription.</label>
        <p className="muted">Requires Chrome or Edge. Your browser may process audio through its speech service; only the transcript is sent to this app for local rule scoring. Scoring is limited to 1,000 characters per sample.</p>
        {liveProblem && <p className="playproblem" role="alert">{liveProblem}</p>}
      </section>}
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
        <small>{source === 'live'
          ? 'Live microphone transcription uses browser speech recognition; recognized text is sent to the local rule-scoring endpoint.'
          : source === 'clip' && clip
            ? <>Audio: {clip.provenance}</>
            : <>Audio: browser text-to-speech reading the revised synthetic script. Matching recorded audio is not yet available.</>}</small>
      </div>
      <div className="provenance"><ShieldCheck size={14}/><small>Scam signals come from rules applied to transcript text only. Voice characteristics and AI-generated speech are not assessed.</small></div>
      {!isLiveMode && liveProblem && <p className="playproblem" role="status">{liveProblem}</p>}
    </div>
  </div>
  </>;
}

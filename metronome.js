var audioContext;
var volume;

var mentronomeInterval;
var metronomeGain;
var metronomeGainElement;
var tickWaitList = [];
var phraseWaitList = [];
var beat = 0;

var bpm;

function BpmToMs(b){
    return 60000/b;
}

function stopMetronome(){
    audioContext.suspend();
    clearInterval(metronomeInterval);
    beat = 0;
  }
  function startMetronome(bpm,volume){
    audioContext.resume();
    metronomeGain = audioContext.createGain();
    metronomeGain.gain.setValueAtTime(volume,audioContext.currentTime);
    metronomeGain.connect(audioContext.destination);
  
    metronomeInterval = setInterval(tick,BpmToMs(bpm));
  }

function tick(){
    beat ++;
    
    metronomeGain.gain.setValueAtTime(metronomeGainElement.value,audioContext.currentTime);
    var metronomeOsc = audioContext.createOscillator();
    metronomeOsc.type = "triangle";
    metronomeOsc.frequency.setValueAtTime(beat%4==1?440:880,audioContext.currentTime);
    metronomeOsc.connect(metronomeGain);
    metronomeOsc.start(audioContext.currentTime);
    metronomeOsc.stop(audioContext.currentTime+0.02);
    
    tickWaitList.map(f=>f(beat));
}
function addListener(f){
    tickWaitList.push(f);
}
function removeListener(f){
    for(let a=0;a<tickWaitList.length;a++){
        if (tickWaitList[a] == f){tickWaitList.splice(a,1);return true};
    }
    return false;
}
export default function(ctx){
    audioContext=ctx;
    return {
        start:startMetronome,
        stop:stopMetronome,
        addListener,
        removeListener,
    }
}
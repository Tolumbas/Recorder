import {startRecording,stopRecording} from "./recorder.js";
import createMetronome from "./metronome.js";

var $ = s=>document.querySelector(s);
var audioContext = new AudioContext();
let fileReader = new FileReader();

var micStream;
var metronome;
var tracks = [];
const numberOfTracks = 2;

var currentTime;
var ticks = 0;

onload = init;

class Track{
  constructor(id){
    this.id = id;
    this.state = 0;
  }
  queue(stream){
    this.state = 1; // Ready to Record
    this.
  }
  play(){
    var latency = $("#latency").value;
      
    var sourceMain = audioContext.createBufferSource();
    sourceMain.buffer = this.buffer;
    sourceMain.connect(audioContext.destination);
  
    var source2 = audioContext.createBufferSource();
    source2.buffer = this.buffer;
    source2.connect(audioContext.destination);
    
    sourceMain.start(audioContext.currentTime);
    source2.start(audioContext.currentTime + this.buffer.duration-latency,0,latency);
    this.state = 3;
  }
  update(beat){
    switch(this.state){
      case 1:
        if (beat%4==0){
          recroder.startRecording();
          this.beginingBeat = beat;
          this.recLength = $(`.length#t${this.id}`).value;
          this.state = 2;
        }
        break;
      case 2:
        if (beat-this.beginingBeat == this.recLength){
          recorder.stopRecording()
            .then(blobToArrayBuffer)
            .then(audioContext.decodeAudioData)
            .then(buffer=>{
              console.log("Finished...");
              // for (var a of this.eventListeners)a();
              
              this.buffer = buffer;
              this.play();
            })
        }
    } 
  }

}
//$("#recording").classList.add("hidden");

var bpm = _=>$("#tempo").value;
var metronomeVolume = _=>$("#metronomeGain").value;

function getStream() {
  if (navigator.mediaDevices) {
    var constraints = { audio: true};
    return navigator.mediaDevices.getUserMedia(constraints)
  }
}
async function init(){
  micStream = await getStream();
  metronome = createMetronome(audioContext);
  setIOEventListeners();
}
function setIOEventListeners(){
  for (var a=0;a<2;a++){
    $(`.record#t${a}`).addEventListener("click",e=>{
      queueRecording($(`.length#t${a}`).value)
        .then(buffer=>{
          assignBufferToTrack(buffer,e.target.id)
          playTrack(tracks[e.target.id]);
        }
        );
    })
    $(`.export#t${a} `).addEventListener("click",e=>{
      download(e.target.id);
    })
  }
  $("#play").addEventListener("click",e=>{
    metronome.start(bpm(),metronomeVolume());
  })
  $("#stop").addEventListener("click",e=>{
    metronome.stop();
  })
}

function playTrack(track){
  var latency = $("#latency").value;
      
  var sourceMain = audioContext.createBufferSource();
  sourceMain.buffer = track;
  sourceMain.connect(audioContext.destination);

  var source2 = audioContext.createBufferSource();
  source2.buffer = track;
  source2.connect(audioContext.destination);
  
  sourceMain.start(audioContext.currentTime);
  source2.start(audioContext.currentTime + track.duration-latency,0,latency);
}

function playAllTracks(){
  for (var a=0;a<numberOfTracks;a++)
    if (tracks[a])
      playTrack(tracks[a]);
}

function blobToArrayBuffer(blob){
  return new Promise((resolve,reject)=>{
    fileReader.onloadend = () => {
        resolve(fileReader.result);
    }
    fileReader.readAsArrayBuffer(blob);
  })

}

metronome.addListener(beat=>{
  for (let track of tracks){
    track.update(beat);
  }
})

async function queueRecording(beats){
  let startBeat;
  console.log("Queued...");

  while((startBeat = await waitTick)%4!=0);
  
  recorder.startRecording(micStream);
  console.log("Recording...");
  $("#recording").classList.remove("hidden");

  while((startBeat-counter)<beats)await waitTick();
  
  var blob = await recorder.stopRecording();
  var arrayBuffer = await blobToArrayBuffer(blob);
  var audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  console.log("Finished...");
  $("#recording").classList.add("hidden");
  return audioBuffer;
}
function assignBufferToTrack(buffer,index){
  tracks[index] = buffer;
}
function download(a){}
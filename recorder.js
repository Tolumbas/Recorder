let audioContext = new AudioContext();
let fileReader = new FileReader();
let osc = audioContext.createOscillator();
let metronomeGain=audioContext.createGain();

let stream,mediaRecorder;

let tracks = [];

let prevtime;
let timebuffer;
let timestart;
let speed,subbeats,phrases;
let offset = 100;

let metronomeVolume = 0.3;

let muteWhenRecording = false;
let recordingTrack;
let state=0;
let currentNode;
console.log("state 0: awaiting input");

osc.type="sine";
osc.connect(metronomeGain);
osc.start();

metronomeGain.gain.value=0;
metronomeGain.connect(audioContext.destination);

addTrack();



function addTrack(buffer){
    let index = tracks.length;
    let track = new Track(index);
    if (buffer){
        track.buffer = buffer;
        repaintBuffer(track.bufferg,buffer);
    }
    tracks[index] = track;
}


navigator.mediaDevices.getUserMedia({video:false,audio:true})
    .then(_stream=>{
        stream = _stream;
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.addEventListener("dataavailable",e=>{
            fileReader.readAsArrayBuffer(e.data);
        })
    })
    .catch(e=>console.log(e));

function now(){return audioContext.currentTime}
function record(event){
    recordingTrack = event.target.getAttribute("data-track");
    state = 1;
    console.log("state 1: Queued recording at track",recordingTrack);
    timebuffer = now();
}

function deleteBuffer(event){
    recordingTrack = event.target.getAttribute("data-track");
    let tr = tracks[recordingTrack];
    tr.buffer = tr.archive.pop();
    repaintBuffer(tr.bufferg,tr.buffer);
}

function stop(){
    for (let t of tracks){
        t.stop();
        audioContext.suspend();
    }
}
async function start(){
    await audioContext.resume();
    phrases = $("phrases").value;
    subbeats = $("subbeats").value;
    speed = phrases*subbeats/$("bpm").value*60;
    
    timestart = audioContext.currentTime;
    console.log("metronome started at", timestart);
}

function beep(frequency){
    if ($("metronomeMuted").checked)return;
    osc.frequency.value = frequency;
    metronomeGain.gain.value = metronomeVolume;
    metronomeGain.gain.setValueAtTime(0,now()+.05); 
}

async function mergeBuffers(buffer1,buffer2){
    let larger= Math.max(buffer1.length,buffer2.length);
    let offcontext = new OfflineAudioContext(buffer1.numberOfChannels,larger,buffer1.sampleRate);
    let node1 = offcontext.createBufferSource();
    node1.buffer = buffer1;
    let node2 = offcontext.createBufferSource();
    node2.buffer = buffer2;
    node1.connect(offcontext.destination);
    node2.connect(offcontext.destination);
    node1.start();
    node2.start();
    return await offcontext.startRendering();
}
function repaintBuffer(_g,_buffer){
    _g.clearRect(0,0,1920,1080);
    _g.beginPath();
    _g.moveTo(0,100);
    let array = _buffer.getChannelData(0);
    let step = Math.ceil(array.length/1920);
    for (let a=0;a<array.length;a+=step){
        _g.lineTo(a/array.length*1920,100+array[a]*100);
    }
    _g.stroke();
}
function setUpDownloadLink(trackNumber){
    let tr = tracks[trackNumber];
    let arraybuffer = audioBufferToWav(tr.buffer);
    let date = new Date();
    let file = new File([arraybuffer],`${date.toLocaleString()}.wav`,{type:"audio/wav"});
    let url = URL.createObjectURL(file);
    let downloadtag = document.querySelector(`a[data-track='${trackNumber}']`);
    downloadtag.href=url;
    downloadtag.download=file.name;
}
/////////////////////////////////////////////////////////////
fileReader.addEventListener("load",async e=>{
    let newbuffer = await audioContext.decodeAudioData(fileReader.result);
    let tr = tracks[recordingTrack];
    let oldBuffer = tr.buffer;
    if (oldBuffer){
        newbuffer = await mergeBuffers(newbuffer,oldBuffer);
        tr.archive.push(oldBuffer);
    }
    tr.buffer = newbuffer;
    
    repaintBuffer(tr.bufferg,tr.buffer);

    tr.lastplayed = now();

    console.log("Ready to loop at",(now()-timestart)%speed/speed);
    if((now()-timestart)%speed/speed<0.1)
        tr.playTrack(0,(now()-timestart)%speed);
    
    setUpDownloadLink(recordingTrack);
})

requestAnimationFrame(function redraw(){
    
    for(var tr of tracks){
        tr.g.clearRect(0,0,1920,200);
        if (tr.buffer){
            tr.g.drawImage(tr.buffercanvas,0,0);
        }
        let progress =(now()-timestart)%speed/speed
        tr.g.fillRect(progress*1920,0,1,200);

        if (state != 2 || !$("muteWhenRecording").checked){
            if (Math.floor((tr.lastplayed-timestart)/speed)<Math.floor((now()-timestart)/speed)){
                tr.playTrack();
                tr.lastplayed = now();
            }
        }
    }
    
    switch(state){
        case 1:
            if (Math.floor((timebuffer-timestart)/speed)<Math.floor((now()-timestart)/speed)){
                state = 2;
                console.log("state 2: Recording...");
                setTimeout(()=>mediaRecorder.start(),offset)
                timebuffer = now();
            }
            break;
        case 2:
            if (Math.floor((timebuffer-timestart)/speed)<Math.floor((now()-timestart)/speed)){
                setTimeout(()=>mediaRecorder.stop(),offset);
                state = 0;
                console.log("state 0: Finished recording...")
            }
            break;
    }

    if (Math.floor((prevtime-timestart)/(speed/subbeats/phrases))<Math.floor((now()-timestart)/(speed/subbeats/phrases)))
        if (Math.floor((prevtime-timestart)/(speed/phrases))<Math.floor((now()-timestart)/(speed/phrases)))
            beep(880);
        else
            beep(440);
    
    prevtime=now();

    requestAnimationFrame(redraw);
})
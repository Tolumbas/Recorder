
let fileReader = new FileReader();
let osc = audioContext.createOscillator();
let metronomeGain=audioContext.createGain();

let stream,mediaRecorder;

let tracks = [];

let prevtime=-100;
let timebuffer;
let timestart;
let subbeats,phraselength;
let lastclick;
let offset = 100;

let metronomeVolume = 0.2;

let muteWhenRecording = false;
let recordingTrackIndex,recordingTrack,recordingTrackLength;
let state=0;
let currentNode;
console.log("state 0: awaiting input");

osc.type="sine";
osc.connect(metronomeGain);
osc.start();

metronomeGain.gain.value=0;
metronomeGain.connect(audioContext.destination);

addTrack();
/////////////////////////////////////////////////////////////


function playTrack(tr,when=0,_offset=0){
    if (tr.buffer){
        tr.stop();

        tr.node = tr.connectWith(audioContext);
        tr.node.loop=true;
        if (now()<=when)
            tr.node.start(when,_offset);
        else
            tr.node.start(0,_offset+(now()-when));
    }
}


async function fileHandler(file){
    let uncut = await audioContext.decodeAudioData(file);

    let newbuffer = await cutBufferToSize(uncut,recordingTrackLength);
    
    let oldBuffer = recordingTrack.buffer;
    if (oldBuffer){
        newbuffer = await mergeBuffers(newbuffer,oldBuffer);
        recordingTrack.archive.push(oldBuffer);
    }
    recordingTrack.buffer = newbuffer;

    let dtime = now()-timestart;
    console.log("Ready to loop at",dtime%recordingTrackLength/recordingTrackLength);
    if(dtime%recordingTrackLength/recordingTrackLength<0.1)
        playTrack(recordingTrack,now(),dtime%recordingTrackLength);
    else
        playTrack(recordingTrack,timestart+Math.floor(dtime/recordingTrackLength)*recordingTrackLength)    
}

window.addEventListener("keydown",e=>{
    if (e.keyCode == 73){ // i
        if (!lastclick || Date.now()-lastclick>2000){
            lastclick=Date.now();
        }
        else{
            let bpm= 1/((Date.now()-lastclick)/1000/60);
            $("bpm").value = Math.round(bpm);
            lastclick=Date.now();
        }
    }
})

function addTrack(buffer){
    let index = tracks.length;
    let track = new Track(index);
    track.buffer = buffer;
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

function record(event){
    if(state == 1){
        console.log("Already Recording");
        return;
    }
    recordingTrackIndex = event.target.getAttribute("data-track");
    recordingTrack = tracks[recordingTrackIndex];
    recordingTrackLength = recordingTrack.phrases*phraselength;
    state = 1;
    console.log("state 1: Queued recording at track",recordingTrackIndex);
    timebuffer = now();
}
function dragOver(event){
    event.preventDefault()
}
function loadFile(event){
    event.preventDefault();
    if (!event.dataTransfer.items || event.dataTransfer.items.length != 1){
        console.log("error on loadfile",files);
        return;
    }
    let file = event.dataTransfer.items[0].getAsFile();
    recordingTrackIndex = event.target.getAttribute("data-track");
    console.log(file);
    fileReader.readAsArrayBuffer(file);
}

function deleteBuffer(event){
    recordingTrackIndex = event.target.getAttribute("data-track");
    let tr = tracks[recordingTrackIndex];
    tr.undoBuffer();
    playTrack(tr,now(),(now()-timestart)%(tr.phrases*phraselength))
}

function stop(){
    tracks.forEach(t=>t.stop());
    audioContext.suspend();
}
async function start(){
    await audioContext.resume();
    subbeats = $("subbeats").value;
    phraselength = subbeats/$("bpm").value*60;
    
    timestart = audioContext.currentTime;
    tracks.forEach(t=>playTrack(t,now()));
    console.log("metronome started at", timestart);
}

function beep(frequency){
    if ($("metronomeMuted").checked)return;
    osc.frequency.value = frequency;
    metronomeGain.gain.value = metronomeVolume;
    metronomeGain.gain.linearRampToValueAtTime(0,now()+.05); 
}


fileReader.addEventListener("load",async ()=>{
    return await fileHandler(fileReader.result);
})

async function exportAll(){
    try{
        let allbuffer = await mergeAllTracks();
        bufferToLink(allbuffer,$("downloadall"));
    }
    catch(e){
        console.log(e);
    }
}

requestAnimationFrame(function redraw(){
    requestAnimationFrame(redraw);
    if(!timestart)return;


    ///tracks
    for(let tr of tracks){
        tr.g.clearRect(0,0,tr.canvas.width,tr.canvas.height);
        if (tr.buffer){
            tr.g.drawImage(tr.buffercanvas,0,0);
        }
        let tracklength=tr.phrases*phraselength;
        let progress =(now()-timestart)%tracklength/tracklength;
        tr.g.fillRect(progress*tr.canvas.width,0,1,tr.canvas.height);
    }
    ///recording
    switch(state){
    case 1:
        if (isNaN(recordingTrackLength))
            recordingTrackLength=recordingTrack.phrases*phraselength;
        if (Math.floor((timebuffer-timestart)/recordingTrackLength)<Math.floor((now()-timestart)/recordingTrackLength)){
            state = 2;
            console.log("state 2: Recording...");
            setTimeout(()=>mediaRecorder.start(),offset)
            timebuffer = now();
        }
        break;
    case 2:
        if (Math.floor((timebuffer-timestart)/recordingTrackLength)<Math.floor((now()-timestart)/recordingTrackLength)){
            setTimeout(()=>mediaRecorder.stop(),offset+150);
            state = 0;
            console.log("state 0: Finished recording...")
        }
        break;
    }
    ///metronome
    if (Math.floor((prevtime-timestart)/(phraselength/subbeats))<Math.floor((now()-timestart)/(phraselength/subbeats)))
        if (Math.floor((prevtime-timestart)/phraselength)<Math.floor((now()-timestart)/phraselength))
            beep(880);
        else
            beep(440);
    
    prevtime=now();

})

let fileReader = new FileReader();
let osc = audioContext.createOscillator();
let metronomeGain=audioContext.createGain();

let stream,mediaRecorder;

let tracks = [];

let prevtime;
let timebuffer;
let timestart;
let speed,subbeats,phrases;
let lastclick;
let offset = 100;

let metronomeVolume = 0.2;

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
/////////////////////////////////////////////////////////////


function playTrack(tr,when=0,_offset=0){
    if (tr.node){
        tr.node.stop();
        tr.node.disconnect();
    }
    let time = now();
    tr.node = tr.connectWith(audioContext);
    tr.node.loop=true;
    if (now()<=when)
        tr.node.start(when,_offset);
    else{
        tr.node.start(0,_offset+(now()-when));
    }
}

async function fileHandler(file){
    let uncut = await audioContext.decodeAudioData(file);
    console.log(uncut.duration);
    let newbuffer =audioContext.createBuffer(
        uncut.numberOfChannels,
        speed*uncut.numberOfChannels*uncut.sampleRate,
        uncut.sampleRate
    );
    let data = new Float32Array(speed*uncut.numberOfChannels*uncut.sampleRate);
    for (let a =0;a<uncut.numberOfChannels;a++){
        uncut.copyFromChannel(data,a);
        newbuffer.copyToChannel(data,a);
    }

    let tr = tracks[recordingTrack];
    let oldBuffer = tr.buffer;
    if (oldBuffer){
        newbuffer = await mergeBuffers(newbuffer,oldBuffer);
        tr.archive.push(oldBuffer);
    }
    tr.buffer = newbuffer;

    tr.lastplayed = now();

    console.log("Ready to loop at",(now()-timestart)%speed/speed);
    if((now()-timestart)%speed/speed<0.1)
        playTrack(tr,now(),(now()-timestart)%speed);
    else
        playTrack(tr,Math.ceil((now()-timestart)/speed)*speed+now())    
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
    recordingTrack = event.target.getAttribute("data-track");
    state = 1;
    console.log("state 1: Queued recording at track",recordingTrack);
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
    recordingTrack = event.target.getAttribute("data-track");
    console.log(file);
    fileReader.readAsArrayBuffer(file);
}

function deleteBuffer(event){
    recordingTrack = event.target.getAttribute("data-track");
    let tr = tracks[recordingTrack];
    tr.undoBuffer();
    playTrack(tr,now(),(now()-timestart)%speed)
}

function stop(){
    for (let t of tracks){
        t.stop();
    }
    audioContext.suspend();
}
async function start(){
    await audioContext.resume();
    phrases = $("phrases").value;
    subbeats = $("subbeats").value;
    speed = phrases*subbeats/$("bpm").value*60;
    
    timestart = audioContext.currentTime;
    for (let tr of tracks){
        if (tr.buffer){
            playTrack(tr,now());
        }
    }
    console.log("metronome started at", timestart);
}

function beep(frequency){
    if ($("metronomeMuted").checked)return;
    osc.frequency.value = frequency;
    metronomeGain.gain.value = metronomeVolume;
    metronomeGain.gain.setValueAtTime(0,now()+.05); 
}


async function mergeAllTracks(){

    // let largest= tracks[0].buffer.length;
    let largest= 0;
    for (let a=0;a<tracks.length;a++){
        if (tracks[a].buffer){
            largest = Math.max(largest,tracks[a].buffer.length);
        }
    }
    if (largest == 0){
        throw "Nothing to Export";
    }
    let offcontext = new OfflineAudioContext(
        tracks[0].buffer.numberOfChannels,
        largest,
        tracks[0].buffer.sampleRate
    );
    for (let a=0;a<tracks.length;a++){
        let node = tracks[a].connectWith(offcontext);
        node.start();
    }
    return await offcontext.startRendering();
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
    ///tracks
    for(var tr of tracks){
        tr.g.clearRect(0,0,1920,200);
        if (tr.buffer){
            tr.g.drawImage(tr.buffercanvas,0,0);
        }
        let progress =(now()-timestart)%speed/speed
        tr.g.fillRect(progress*1920,0,1,200);

        // if (state != 2 || !$("muteWhenRecording").checked){
        //     if (Math.floor((tr.lastplayed-timestart)/speed)<Math.floor((now()-timestart)/speed)){
        //         if (!tr.looping){
        //             tr.playTrack();
        //             tr.lastplayed = now();
        //         }
        //     }
        // }
    }
    ///recording
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
                setTimeout(()=>mediaRecorder.stop(),offset+150);
                state = 0;
                console.log("state 0: Finished recording...")
            }
            break;
    }
    ///metronome
    if (Math.floor((prevtime-timestart)/(speed/subbeats/phrases))<Math.floor((now()-timestart)/(speed/subbeats/phrases)))
        if (Math.floor((prevtime-timestart)/(speed/phrases))<Math.floor((now()-timestart)/(speed/phrases)))
            beep(880);
        else
            beep(440);
    
    prevtime=now();

    requestAnimationFrame(redraw);
})
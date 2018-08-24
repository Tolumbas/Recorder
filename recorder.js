let audioContext = new AudioContext();
let fileReader = new FileReader();
let osc = audioContext.createOscillator();
// let anlyzr = audioContext.createAnalyser();
let metronomeGain=audioContext.createGain();
let c = document.getElementById("waveform");
let downloadtag = document.getElementById("download");
let g = c.getContext("2d");
let stream,mediaRecorder;
let archive=[];

let buffer;

let prevtime;
let lastplayed;
let timebuffer;
let timestart;
let speed = 8;
let offset = 100;

let metronomeMuted = false;
let state=0;
let currentNode;
console.log("state 0: awaiting input");

osc.type="sine";
osc.start();

metronomeGain.connect(audioContext.destination);
metronomeGain.gain.value=0.3;

navigator.mediaDevices.getUserMedia({video:false,audio:true})
    .then(_stream=>{
        stream = _stream;
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.addEventListener("dataavailable",e=>{
            fileReader.readAsArrayBuffer(e.data);
        })
    })
    .catch(e=>console.log(e));
audioContext.addEventListener("statechange",e=>{
    console.log("CONTEXT STATE CHANGE",audioContext.state);
    if (audioContext.state == "suspended"){
        state = 5;
        if (currentNode)currentNode.disconnect();
    }
    else{
        state = 4;
    }
})

function now(){return audioContext.currentTime}
function record(){
    state = 1;
    console.log("state 1: Queued recording");
    timebuffer = audioContext.currentTime;
}
function deleteBuffer(){
    buffer = archive.pop();
}
function stop(){
    audioContext.suspend();
}
async function start(){
    await audioContext.resume()
    timestart = audioContext.currentTime;
    console.log("metronome started at", timestart);
}
function playBuffer(when,offset){
    let node = audioContext.createBufferSource();
    node.buffer = buffer;
    node.connect(audioContext.destination);
    node.start(when,offset);
    currentNode = node;
}
function beep(frequency){
    if (metronomeMuted)return;
    osc.frequency.value = frequency;
    osc.connect(metronomeGain);
    setTimeout(()=>osc.disconnect(),50);        
}
function toggleMetronome(){
    metronomeMuted = !metronomeMuted;
}

fileReader.addEventListener("load",async e=>{
    newbuffer = await audioContext.decodeAudioData(fileReader.result);
    if (buffer){
        var offcontext = new OfflineAudioContext(buffer.numberOfChannels,buffer.length,buffer.sampleRate);
        var node1 = offcontext.createBufferSource();
        node1.buffer = buffer;
        var node2 = offcontext.createBufferSource();
        node2.buffer = newbuffer;
        node1.connect(offcontext.destination);
        node2.connect(offcontext.destination);
        node1.start();
        node2.start();
        newbuffer = await offcontext.startRendering();

        archive.push(buffer);
    }
    
    buffer = newbuffer;
    
    lastplayed = now(); 
    state = 4;
    console.log("state 4: Ready to loop at",(now()-timestart)%speed/speed);
    if((now()-timestart)%speed/speed<0.1)
        playBuffer(0,(now()-timestart)%speed);
    
    var arraybuffer = audioBufferToWav(buffer);
    var date = new Date();
    var file = new File([arraybuffer],`${date.toLocaleString()}.wav`,{type:"audio/wav"});
    var url = URL.createObjectURL(file);
    downloadtag.href=url;
    downloadtag.download=file.name;
    

    
})

requestAnimationFrame(function redraw(){
    g.clearRect(0,0,1920,200);
    
    if (buffer){
        g.beginPath();
        g.moveTo(0,100);
        var array = buffer.getChannelData(0);
        var step = Math.ceil(array.length/1920);
        for (var a=0;a<array.length;a+=step){
            g.lineTo(a/array.length*1920,100+array[a]*100);
        }
        g.stroke();
    }



    let progress =(now()-timestart)%speed/speed
    g.fillRect(progress*1920,0,1,200);
    
    switch(state){
        case 1:
            if (Math.floor((timebuffer-timestart)/speed)<Math.floor((now()-timestart)/speed)){
                state = 2;
                console.log("state 2: Recording...");
                setTimeout(()=>{
                    mediaRecorder.start();
                },offset)
                timebuffer = now();
            }
            break;
        case 2:
            if (Math.floor((timebuffer-timestart)/speed)<Math.floor((now()-timestart)/speed)){
                setTimeout(()=>{
                    mediaRecorder.stop();
                },offset)
                state = 3;
                console.log("state 3: Finishing recording...")
            }
            break;
        case 4:
            if (Math.floor((lastplayed-timestart)/speed)<Math.floor((now()-timestart)/speed)){
                playBuffer(0);
                lastplayed = now();
            }
            break;
    }

    if (Math.floor((prevtime-timestart)/(speed/16))<Math.floor((now()-timestart)/(speed/16)))
        if (Math.floor((prevtime-timestart)/(speed/2))<Math.floor((now()-timestart)/(speed/2)))
            beep(880);
        else
            beep(440);
    
    prevtime=now();

    requestAnimationFrame(redraw);
})
// console.log(1)

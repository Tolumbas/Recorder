let audioContext = new AudioContext();
let $ = s => document.getElementById(s);
let now = ()=>audioContext.currentTime;

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

async function mergeAllTracks(){
    let largest= tracks.reduce((acc,t)=>t.buffer?Math.max(acc,t.buffer.length):0,0);
    if (largest == 0){
        throw "Nothing to Export";
    }
    let offcontext = new OfflineAudioContext(
        tracks[0].buffer.numberOfChannels,
        largest,
        tracks[0].buffer.sampleRate
    );
    tracks.map(t=>{
        let node = t.connectWith(offcontext);
        node.start();
    })
    return await offcontext.startRendering();
}

function bufferToLink(buffer,link){
    let arraybuffer = audioBufferToWav(buffer);
    let name = $("songname").value || new Date();
    let file = new File([arraybuffer],`${name}.wav`,{type:"audio/wav"});
    let url = URL.createObjectURL(file);
    link.href=url;
    link.download=file.name;
}
function cutBufferToSize(uncut,tracklength){
    let newbuffer =audioContext.createBuffer(
        uncut.numberOfChannels,
        tracklength*uncut.sampleRate,
        uncut.sampleRate
    );
    let tail = audioContext.createBuffer(
        uncut.numberOfChannels,
        Math.max(uncut.length-newbuffer.length,1),
        uncut.sampleRate
    )
    let data = new Float32Array(uncut.length);
    for (let a =0;a<uncut.numberOfChannels;a++){
        uncut.copyFromChannel(data,a);
        newbuffer.copyToChannel(data,a);
        tail.copyToChannel(data.subarray(newbuffer.length),a);
    }
    let c = new OfflineAudioContext(
        newbuffer.numberOfChannels,
        newbuffer.length,
        newbuffer.sampleRate
    );

    let mainnode = c.createBufferSource();
    mainnode.buffer=newbuffer;

    let tailnode = c.createBufferSource();
    tailnode.buffer=tail;

    let fadeoutgain = c.createGain();
    let maingain = c.createGain();
    maingain.gain.value = 0.01;
    mainnode.connect(maingain).connect(c.destination);
    tailnode.connect(fadeoutgain).connect(c.destination);
    fadeoutgain.gain.exponentialRampToValueAtTime(0.01,tail.duration);
    maingain.gain.exponentialRampToValueAtTime(1,tail.duration);
    mainnode.start();
    tailnode.start();
    return c.startRendering();
}
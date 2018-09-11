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

function bufferToLink(buffer,link){
    let arraybuffer = audioBufferToWav(buffer);
    let name = $("songname").value || new Date();
    let file = new File([arraybuffer],`${name}.wav`,{type:"audio/wav"});
    let url = URL.createObjectURL(file);
    link.href=url;
    link.download=file.name;
}


let template = $("tracktemplate");
let tracksContainer = $("tracks");
let impulseBuffer;

fetch("irHall.ogg")
    .then(responce=>responce.arrayBuffer())
    .then(arrayBuffer=>audioContext.decodeAudioData(arrayBuffer))
    .then(audioBuffer=>impulseBuffer=audioBuffer);

class Track{
constructor(index){
    this.index = index;
    this.element = template.content.cloneNode(true);
    let guts = this.element.children;
    for (let a=0;a<guts.length;a++){
        guts[a].setAttribute("data-track",index);
        switch(guts[a].id){
        case "waveform": 
            this.canvas = guts[a];
            break;
        case "volume": 
        guts[a].addEventListener("change",e=>{
            this.gain.gain.value=e.target.value;
        })    
        break;
        case "reverb": 
        guts[a].addEventListener("change",e=>{
            if(this.reverbgain){
                this.reverbgain.gain.value = e.target.value;
                this.reverbbypass.gain.value = 1-this.reverbgain.gain.value;
            }
        })    
        break;
        }
        
    }
    tracksContainer.appendChild(this.element);
    
    this.g = this.canvas.getContext('2d');

    this.buffercanvas = document.createElement("canvas");
    this.buffercanvas.width = 1920;
    this.buffercanvas.height = 1080;
    this.bufferg = this.buffercanvas.getContext('2d');

    this.phrases = 4;
    this.archive = [];
}
set buffer(b){
    if(b){
        this._buffer= b;
        this.repaintBuffer();
        this.setUpDownloadLink();
    }
}
get buffer(){
    return this._buffer;
}
undoBuffer(){
    if(this.archive.length==0){
        this._buffer = undefined;
        this.bufferg.clearRect(0,0,1920,1080);
    }
    else{
        this.buffer = this.archive.pop();
    }

}

connectWith(context){
    let node = context.createBufferSource();
    node.buffer = this.buffer;
    node.loop = true;
    let currentNode = node;
    
    // node.connect(effectChainStart);

    if(impulseBuffer){
        this.reverbgain = context.createGain();
        this.reverbgain.gain.value = document.querySelector(`#reverb[data-track="${this.index}"]`).value
        
        this.reverbbypass = context.createGain();
        this.reverbbypass.gain.value = 1-this.reverbgain.gain.value;

        this.reverbFinal = context.createGain();

        this.reverb = context.createConvolver();
        this.reverb.buffer = impulseBuffer;

        currentNode.connect(this.reverbgain).connect(this.reverb).connect(this.reverbFinal);
        currentNode.connect(this.reverbbypass).connect(this.reverbFinal);

        currentNode = this.reverbFinal;
    }

    this.gain = context.createGain();
    this.gain.gain.value = document.querySelector(`#volume[data-track="${this.index}"]`).value
    currentNode.connect(this.gain).connect(context.destination);

    return node;
}
stop(){
    if (this.node){
        this.node.stop();
        this.node.disconnect();
    }
}
setUpDownloadLink(){
    let arraybuffer = audioBufferToWav(this.buffer);
    let date = new Date();
    let file = new File([arraybuffer],`${date.toLocaleString()}.wav`,{type:"audio/wav"});
    let url = URL.createObjectURL(file);
    let downloadtag = document.querySelector(`a[data-track='${this.index}']`);
    downloadtag.href=url;
    downloadtag.download=file.name;
}
repaintBuffer(){
    let _g,_buffer;
    _g = this.bufferg;
    _buffer = this.buffer;

    _g.clearRect(0,0,1920,1080);
    _g.beginPath();
    _g.moveTo(0,100);
    let array = _buffer.getChannelData(0);
    let step = Math.ceil(array.length/1920);
    for (let a=0;a<array.length;a+=step){
        let avarage=0;
        for (let b=a;b<a+step;b++)
            avarage+=array[a]/step;
        _g.lineTo(a/array.length*1920,100+avarage*100);
    }
    _g.stroke();
}



}


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
            this.canvas.width = innerWidth;
            this.canvas.height = 200;
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
        case "phrases":
            guts[a].addEventListener("change",e=>{
                this.phrases = e.target.value;
            });
            break;
        }
        
    }
    tracksContainer.appendChild(this.element);
    
    this.g = this.canvas.getContext('2d');

    this.buffercanvas = document.createElement("canvas");
    this.buffercanvas.width = this.canvas.width;
    this.buffercanvas.height = this.canvas.height;
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
        this.bufferg.clearRect(
            0,
            0,
            this.buffercanvas.width,
            this.buffercanvas.height
            );
        this.stop();
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

    let {width,height} = this.buffercanvas;

    this.bufferg.clearRect(0,0,width,height);
    this.bufferg.beginPath();
    this.bufferg.strokeStyle='white';
    this.bufferg.moveTo(0,100);
    let array = this.buffer.getChannelData(0);
    let step = Math.floor(array.length/width);
    for (let a=0;a<array.length;a+=step){
        let max=0;
        for (let b=a;b<a+step;b++)
            max=Math.max(max,Math.abs(array[b]));
        if(a!=0)
            this.bufferg.lineTo(a/array.length*width,height-max*height);
        else
            this.bufferg.moveTo(a/array.length*width,height-max*height);
    }
    this.bufferg.stroke();
}



}
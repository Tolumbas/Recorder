let $ = s => document.getElementById(s);


let template = $("tracktemplate");
let tracksContainer = $("tracks");

class Track{
    constructor(index){
        this.element = template.content.cloneNode(true);
        let guts = this.element.children;
        for (var a=0;a<guts.length;a++){
            guts[a].setAttribute("data-track",index);
            if (guts[a].id =="waveform"){
                this.canvas = guts[a];
            }
        }
        tracksContainer.appendChild(this.element);
        
        this.g = this.canvas.getContext('2d');

        this.buffercanvas = document.createElement("canvas");
        this.buffercanvas.width = 1920;
        this.buffercanvas.height = 1080;
        this.bufferg = this.buffercanvas.getContext('2d');

        this.archive = [];
    }
    playTrack(when=0,_offset=0){
        if (this.node){
            this.node.stop();
            this.node.disconnect();
        }
        this.node = audioContext.createBufferSource();
        this.node.buffer = this.buffer;
        this.node.connect(audioContext.destination);
        this.node.start(when,_offset);
    }
    stop(){
        if (this.node){
            this.node.stop();
            this.node.disconnect();
        }
    }
}
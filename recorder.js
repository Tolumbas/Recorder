
var mediaRecorder;

export function startRecording(stream){
    if (stream || !mediaRecorder)
        mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
}
export async function stopRecording(){
    if (!mediaRecorder || mediaRecorder.state == "inactive")
      throw("< Recorder is not Recording")
    mediaRecorder.stop();
    return await new Promise(resolve=>
      mediaRecorder.addEventListener("dataavailable",e=>resolve(e.data))
    )
}
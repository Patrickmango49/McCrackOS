import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Camera, CameraOff, Circle, Download, FlipHorizontal, Grid3X3, Image as ImageIcon, RotateCcw, Settings2, Timer, Video, X, Zap } from "lucide-react";

type Capture = { id: string; url: string; kind: "photo" | "video"; name: string; createdAt: number };

const FILTERS = [
  { name: "Natural", css: "none" },
  { name: "Mono", css: "grayscale(1)" },
  { name: "Warm", css: "sepia(.32) saturate(1.25)" },
  { name: "Cool", css: "saturate(.9) hue-rotate(15deg)" },
  { name: "Vivid", css: "saturate(1.65) contrast(1.08)" },
  { name: "Soft", css: "brightness(1.08) saturate(.82)" },
  { name: "Dream", css: "contrast(.9) brightness(1.08) saturate(1.2)" },
];

export function CameraSurface() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [filter, setFilter] = useState(0);
  const [grid, setGrid] = useState(true);
  const [mirror, setMirror] = useState(false);
  const [flash, setFlash] = useState(false);
  const [timer, setTimer] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quality, setQuality] = useState<"high" | "medium">("high");

  const stopCamera = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  }, []);

  const startCamera = useCallback(async (nextFacing = facing, nextQuality = quality) => {
    setError("");
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is unavailable in this browser. Open McCrackOS over HTTPS and allow camera permissions.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: nextFacing },
          width: { ideal: nextQuality === "high" ? 1920 : 1280 },
          height: { ideal: nextQuality === "high" ? 1080 : 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStreaming(true);
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { min: number; max: number } };
      if (caps?.zoom) setZoom(Math.max(caps.zoom.min, Math.min(caps.zoom.max, zoom)));
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      setError(name === "NotAllowedError" ? "Camera permission was denied. Allow camera access in your browser settings, then try again." :
        name === "NotFoundError" ? "No camera was found on this device." :
        name === "NotReadableError" ? "The camera is busy in another app. Close the other app and retry." :
        "Couldn't start the camera. Check permissions and try again.");
    }
  }, [facing, quality, stopCamera, zoom]);

  useEffect(() => {
    void startCamera();
    return () => {
      recorderRef.current?.stop();
      stopCamera();
      captures.forEach((item) => URL.revokeObjectURL(item.url));
    };
    // Camera is started once when the app opens; camera changes use the explicit controls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCapture = (blob: Blob, kind: Capture["kind"]) => {
    const url = URL.createObjectURL(blob);
    const extension = kind === "photo" ? "jpg" : "webm";
    setCaptures((items) => [{ id: crypto.randomUUID?.() ?? String(Date.now()), url, kind, name: `McCrack-${kind}-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`, createdAt: Date.now() }, ...items]);
    setGalleryOpen(true);
  };

  const takePhoto = async () => {
    if (!streaming || !videoRef.current || !canvasRef.current) return;
    if (timer > 0) await new Promise((resolve) => window.setTimeout(resolve, timer * 1000));
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) return;
    if (mirror || (facing === "user" && mirror)) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.filter = FILTERS[filter].css;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (blob) saveCapture(blob, "photo"); }, "image/jpeg", quality === "high" ? .94 : .82);
  };

  const toggleRecording = () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") {
      setError("Video recording isn't supported by this browser.");
      return;
    }
    try {
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        if (blob.size) saveCapture(blob, "video");
        setRecording(false);
        setElapsed(0);
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
      };
      recorder.start(250);
      recorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    } catch {
      setError("Couldn't start video recording on this device.");
    }
  };

  const setCameraZoom = async (value: number) => {
    setZoom(value);
    const track = streamRef.current?.getVideoTracks()[0];
    try {
      const caps = track?.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { min: number; max: number } };
      if (track && caps?.zoom) await track.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] });
    } catch { /* digital zoom remains available through the preview */ }
  };

  const toggleFlash = async () => {
    const next = !flash;
    setFlash(next);
    const track = streamRef.current?.getVideoTracks()[0];
    try {
      const capabilities = track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
      if (track && capabilities?.torch) await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      else setError("This camera does not support a hardware flash. The preview controls still work normally.");
    } catch { setError("The camera could not enable its flash on this device."); }
  };

  const downloadCapture = (item: Capture) => {
    const link = document.createElement("a");
    link.href = item.url;
    link.download = item.name;
    link.click();
  };

  const stageStyle = { "--camera-zoom": String(zoom), "--camera-mirror": mirror ? "-1" : "1", "--camera-filter": FILTERS[filter].css } as CSSProperties;

  return (
    <div className="camera-app">
      <style>{`
        .camera-app{height:100%;min-height:420px;display:flex;flex-direction:column;background:#090b11;color:#f7f9ff;font-family:Inter,system-ui,sans-serif;overflow:hidden}
        .camera-top{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;gap:10px;border-bottom:1px solid #ffffff14;background:#10141d}
        .camera-brand{display:flex;align-items:center;gap:10px;font-weight:750;letter-spacing:-.3px}.camera-brand-mark{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,#23d9ed,#1686c9);color:#04111b}
        .camera-top-actions{display:flex;gap:7px}.camera-icon-btn{width:36px;height:36px;border-radius:12px;border:1px solid #ffffff18;background:#ffffff0b;color:#eaf5ff;display:grid;place-items:center;cursor:pointer}.camera-icon-btn:hover{background:#ffffff18}
        .camera-stage{position:relative;flex:1;min-height:250px;background:#030508;display:grid;place-items:center;overflow:hidden}.camera-stage video{width:100%;height:100%;max-height:100%;object-fit:contain;transform:scale(var(--camera-zoom,1)) scaleX(var(--camera-mirror,1));filter:var(--camera-filter,none);transition:filter .2s}
        .camera-grid{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(90deg,transparent 33.1%,#ffffff44 33.3%,transparent 33.6%,transparent 66.4%,#ffffff44 66.6%,transparent 66.9%),linear-gradient(0deg,transparent 33.1%,#ffffff44 33.3%,transparent 33.6%,transparent 66.4%,#ffffff44 66.6%,transparent 66.9%)}
        .camera-hud{position:absolute;top:14px;left:14px;right:14px;display:flex;justify-content:space-between;pointer-events:none}.camera-pill{padding:7px 10px;border-radius:99px;background:#05080caa;border:1px solid #ffffff1c;font-size:11px;backdrop-filter:blur(12px)}
        .camera-error{position:absolute;inset:auto 16px 18px;padding:12px 14px;border-radius:14px;background:#321c25ed;border:1px solid #ff7c9638;color:#ffdbe3;font-size:12px;line-height:1.5;max-width:520px}
        .camera-controls{padding:14px 16px 18px;background:linear-gradient(180deg,#10141d,#0b0e15);border-top:1px solid #ffffff12}
        .camera-tools{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:15px}.camera-tool{display:flex;align-items:center;gap:7px;border:1px solid #ffffff16;background:#ffffff08;color:#dce7f4;border-radius:12px;padding:8px 11px;font-size:11px;cursor:pointer}.camera-tool.active{border-color:#21c8dc88;background:#13bfd51b;color:#7cecff}
        .camera-shutter-row{display:flex;align-items:center;justify-content:center;gap:22px}.camera-side-btn{width:43px;height:43px;border-radius:50%;border:1px solid #ffffff22;background:#ffffff0c;color:#fff;display:grid;place-items:center;cursor:pointer}.camera-shutter{width:68px;height:68px;border-radius:50%;border:5px solid #fff;background:#f8fbff;box-shadow:0 0 0 5px #ffffff25;cursor:pointer;display:grid;place-items:center}.camera-shutter:active{transform:scale(.94)}.camera-record{width:54px;height:54px;border-radius:50%;border:2px solid #ff6b76;background:#ff4759;display:grid;place-items:center;cursor:pointer;color:#fff}.camera-record.active{background:#a92334}
        .camera-filters{display:flex;gap:7px;overflow:auto;padding:4px 2px 10px}.camera-filter{flex:0 0 auto;border:1px solid #ffffff1c;border-radius:10px;padding:7px 11px;background:#ffffff08;color:#cdd6e4;font-size:11px;cursor:pointer}.camera-filter.active{border-color:#21d6eb;background:#10b9d31c;color:#7cecff}
        .camera-panel{position:absolute;inset:12px 12px 12px auto;width:min(320px,calc(100% - 24px));overflow:auto;border:1px solid #ffffff24;border-radius:18px;background:#101722f2;backdrop-filter:blur(22px);padding:13px;box-shadow:0 18px 60px #0009}
        .camera-panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-weight:700}.camera-gallery-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.camera-gallery-item{background:#ffffff0c;border:1px solid #ffffff16;border-radius:12px;overflow:hidden}.camera-gallery-item img,.camera-gallery-item video{width:100%;aspect-ratio:4/3;object-fit:cover;background:#05070b}.camera-gallery-item button{border:0;background:transparent;color:#dff6ff;font-size:11px;padding:8px;width:100%;cursor:pointer}
        .camera-setting-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #ffffff13;font-size:12px}.camera-setting-row select,.camera-setting-row input{accent-color:#20cde2}
        @media(max-width:600px){.camera-top{padding:10px 12px}.camera-tool{padding:7px 9px}.camera-stage{min-height:220px}.camera-controls{padding:10px 10px 14px}}
      `}</style>
      <div className="camera-top">
        <div className="camera-brand"><span className="camera-brand-mark"><Camera size={19}/></span><span>McCrack Camera</span></div>
        <div className="camera-top-actions">
          <button className="camera-icon-btn" title="Open gallery" onClick={() => setGalleryOpen(true)}><ImageIcon size={17}/></button>
          <button className="camera-icon-btn" title="Camera settings" onClick={() => setSettingsOpen(true)}><Settings2 size={17}/></button>
          <button className="camera-icon-btn" title="Restart camera" onClick={() => void startCamera()}><RotateCcw size={17}/></button>
        </div>
      </div>
      <div className="camera-stage" style={stageStyle}>
        <video ref={videoRef} playsInline muted autoPlay />
        <canvas ref={canvasRef} hidden />
        {grid && streaming ? <div className="camera-grid"/> : null}
        <div className="camera-hud"><span className="camera-pill">{recording ? "● REC " + elapsed + "s" : streaming ? "LIVE PREVIEW" : "CAMERA OFF"}</span><span className="camera-pill">{quality === "high" ? "HD" : "720P"}</span></div>
        {!streaming && !error ? <div style={{display:"grid",placeItems:"center",gap:12,color:"#9ba8b8"}}><CameraOff size={36}/><span style={{fontSize:12}}>Starting camera…</span></div> : null}
        {error ? <div className="camera-error">{error}<button className="camera-tool" style={{marginLeft:10}} onClick={() => void startCamera()}>Retry</button></div> : null}
        {galleryOpen ? <div className="camera-panel"><div className="camera-panel-head"><span>Recent captures · {captures.length}</span><button className="camera-icon-btn" onClick={() => setGalleryOpen(false)}><X size={16}/></button></div>{captures.length ? <div className="camera-gallery-grid">{captures.map((item) => <div className="camera-gallery-item" key={item.id}>{item.kind === "photo" ? <img src={item.url} alt={item.name}/> : <video src={item.url} controls/>}<button onClick={() => downloadCapture(item)}><Download size={13} style={{verticalAlign:"middle"}}/> Save {item.kind}</button></div>)}</div> : <p style={{fontSize:12,color:"#aab6c5"}}>Your photos and videos will appear here. Captures stay in this session until you close the Camera app.</p>}</div> : null}
        {settingsOpen ? <div className="camera-panel"><div className="camera-panel-head"><span>Camera settings</span><button className="camera-icon-btn" onClick={() => setSettingsOpen(false)}><X size={16}/></button></div>
          <div className="camera-setting-row"><span>Capture quality</span><select value={quality} onChange={(e) => {const next=e.target.value as "high"|"medium";setQuality(next);void startCamera(facing,next);}}><option value="high">High · 1080p</option><option value="medium">Balanced · 720p</option></select></div>
          <div className="camera-setting-row"><span>Timer</span><select value={timer} onChange={(e) => setTimer(Number(e.target.value))}><option value={0}>Off</option><option value={3}>3 seconds</option><option value={5}>5 seconds</option><option value={10}>10 seconds</option></select></div>
          <div className="camera-setting-row"><span>Digital zoom · {zoom.toFixed(1)}×</span><input aria-label="Zoom" type="range" min="1" max="3" step=".1" value={zoom} onChange={(e) => void setCameraZoom(Number(e.target.value))}/></div>
          <div className="camera-setting-row"><span>Mirror preview</span><input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)}/></div>
          <div className="camera-setting-row"><span>Composition grid</span><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)}/></div>
        </div> : null}
      </div>
      <div className="camera-controls">
        <div className="camera-filters">{FILTERS.map((item, index) => <button className={"camera-filter"+(filter===index?" active":"")} key={item.name} onClick={() => setFilter(index)}>{item.name}</button>)}</div>
        <div className="camera-tools">
          <button className={"camera-tool"+(grid?" active":"")} onClick={() => setGrid((v)=>!v)}><Grid3X3 size={14}/> Grid</button>
          <button className={"camera-tool"+(flash?" active":"")} onClick={() => void toggleFlash()}><Zap size={14}/> Flash {flash?"On":"Off"}</button>
          <button className="camera-tool" onClick={() => {const next=facing==="user"?"environment":"user";setFacing(next);void startCamera(next);}}><FlipHorizontal size={14}/> Flip camera</button>
          <button className="camera-tool" onClick={() => setSettingsOpen(true)}><Timer size={14}/> Timer {timer?timer+"s":"Off"}</button>
        </div>
        <div className="camera-shutter-row">
          <button className="camera-side-btn" title="Gallery" onClick={() => setGalleryOpen(true)}><ImageIcon size={18}/></button>
          <button className="camera-shutter" title="Take photo" onClick={() => void takePhoto()} disabled={!streaming}><Camera size={27} color="#111827"/></button>
          <button className={"camera-record"+(recording?" active":"")} title={recording?"Stop recording":"Record video"} onClick={toggleRecording}><span style={{width:recording?17:20,height:recording?17:20,borderRadius:recording?4:"50%",background:"white"}}/></button>
        </div>
        <div style={{textAlign:"center",fontSize:10,color:"#8996a8",marginTop:12}}>{recording ? "Recording video · "+elapsed+" seconds" : "Tap the shutter for a photo · Red button for video"}</div>
      </div>
    </div>
  );
}

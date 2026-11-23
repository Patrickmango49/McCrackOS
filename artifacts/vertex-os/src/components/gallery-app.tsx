import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, ArrowLeft, Check, ChevronLeft, ChevronRight, Crop, Download, Edit3, Filter, Heart, ImagePlus, MoreHorizontal, RotateCcw, RotateCw, Search, Trash2, Upload, Video, X } from "lucide-react";

type MediaKind = "photo" | "video";
type MediaRecord = { id: string; name: string; kind: MediaKind; type: string; size: number; createdAt: number; blob: Blob; favorite?: boolean };
type GalleryItem = MediaRecord & { url: string };
const DB_NAME = "mccrack-gallery";
const STORE = "media";

function openGalleryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Gallery storage could not be opened."));
  });
}
async function galleryRequest<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openGalleryDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Gallery storage request failed."));
      tx.onabort = () => reject(tx.error ?? new Error("Gallery storage transaction failed."));
    });
  } finally { db.close(); }
}
const formatSize = (size: number) => size < 1024 * 1024 ? `${(size / 1024).toFixed(0)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
const safeName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, "-");

export async function saveGalleryBlob(blob: Blob, kind: MediaKind, name?: string) {
  const ext = kind === "photo" ? (blob.type.includes("png") ? "png" : "jpg") : (blob.type.includes("mp4") ? "mp4" : "webm");
  const record: MediaRecord = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: name || `McCrack-${kind}-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`,
    kind, type: blob.type || "application/octet-stream", size: blob.size, createdAt: Date.now(), blob,
  };
  await galleryRequest<IDBValidKey>("readwrite", (store) => store.put(record));
  window.dispatchEvent(new CustomEvent("mccrack-gallery-updated"));
}

export function GallerySurface() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);\n  const itemsRef = useRef<GalleryItem[]>([]);\n  useEffect(() => { itemsRef.current = items; }, [items]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | MediaKind | "favorites">("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [rotation, setRotation] = useState(0);
  const [imageFilter, setImageFilter] = useState<"none" | "vivid" | "mono" | "warm">("none");
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    try {
      const records = await galleryRequest<MediaRecord[]>("readonly", (store) => store.getAll());
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.url));\n      setItems(records.sort((a,b) => b.createdAt-a.createdAt).map((item) => ({ ...item, url: URL.createObjectURL(item.blob) })));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load your gallery."); }
  };
  useEffect(() => {
    void refresh();
    return () => { items.forEach((item) => URL.revokeObjectURL(item.url)); };
    // The gallery owns object URLs for the current loaded set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => { items.forEach((item) => URL.revokeObjectURL(item.url)); }, [items]);

  const visible = useMemo(() => items.filter((item) => {
    const matches = filter === "all" || (filter === "favorites" ? item.favorite : item.kind === filter);
    return matches && item.name.toLowerCase().includes(query.toLowerCase());
  }), [items, filter, query]);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const importFiles = async (files: FileList | File[]) => {
    const accepted = Array.from(files).filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
    if (!accepted.length) { setError("Choose image or video files to add."); return; }
    setBusy(true); setError("");
    try {
      for (const file of accepted) {
        const record: MediaRecord = {
          id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name || `McCrack-${Date.now()}`,
          kind: file.type.startsWith("video/") ? "video" : "photo",
          type: file.type || "application/octet-stream",
          size: file.size,
          createdAt: Date.now(),
          blob: file,
        };
        await galleryRequest<IDBValidKey>("readwrite", (store) => store.put(record));
      }
      await refresh();
      setNotice(`Added ${accepted.length} ${accepted.length === 1 ? "item" : "items"} to Gallery.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save these files. Your browser may be out of storage.");
    } finally { setBusy(false); }
  };

  const download = (item: GalleryItem) => {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = safeName(item.name);
    document.body.appendChild(a); a.click(); a.remove();
  };
  const remove = async (item: GalleryItem) => {
    if (!window.confirm(`Delete “${item.name}” from this device's Gallery?`)) return;
    await galleryRequest<undefined>("readwrite", (store) => store.delete(item.id));
    URL.revokeObjectURL(item.url);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setSelectedId(null); setEditOpen(false);
  };
  const toggleFavorite = async (item: GalleryItem) => {
    const updated = { ...item, favorite: !item.favorite };
    await galleryRequest<IDBValidKey>("readwrite", (store) => store.put({ id: item.id, name: item.name, kind: item.kind, type: item.type, size: item.size, createdAt: item.createdAt, blob: item.blob, favorite: updated.favorite }));
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, favorite: updated.favorite } : entry));
  };
  const openEditor = (item: GalleryItem) => {
    setSelectedId(item.id); setEditName(item.name); setRotation(0); setImageFilter("none"); setEditOpen(true);
  };
  const saveEdits = async () => {
    if (!selected) return;
    const name = editName.trim() || selected.name;
    if (selected.kind === "photo" && (rotation !== 0 || imageFilter !== "none")) {
      const image = new window.Image();
      image.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const sideways = Math.abs(rotation % 180) === 90;
        canvas.width = sideways ? image.naturalHeight : image.naturalWidth;
        canvas.height = sideways ? image.naturalWidth : image.naturalHeight;
        ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(rotation * Math.PI / 180);
        ctx.filter = imageFilter === "vivid" ? "saturate(1.45) contrast(1.08)" : imageFilter === "mono" ? "grayscale(1)" : imageFilter === "warm" ? "sepia(.22) saturate(1.15)" : "none";
        ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2); ctx.restore();
        canvas.toBlob(async (blob) => {
          if (!blob) { setError("Could not export this edit."); return; }
          await persistEdit(selected, blob, name);
        }, selected.type === "image/png" ? "image/png" : "image/jpeg", .94);
      };
      image.onerror = () => setError("This image format could not be edited in this browser.");
      image.src = selected.url;
    } else {
      await persistEdit(selected, selected.blob, name);
    }
  };
  const persistEdit = async (item: GalleryItem, blob: Blob, name: string) => {
    const record: MediaRecord = { id: item.id, name, kind: item.kind, type: blob.type || item.type, size: blob.size, createdAt: item.createdAt, blob, favorite: item.favorite };
    await galleryRequest<IDBValidKey>("readwrite", (store) => store.put(record));
    const url = URL.createObjectURL(blob);
    setItems((current) => current.map((entry) => {
      if (entry.id !== item.id) return entry;
      URL.revokeObjectURL(entry.url);
      return { ...record, url };
    }));
    setEditOpen(false); setNotice("Changes saved to this device.");
  };

  return <div className="mc-gallery">
    <style>{`
      .mc-gallery{height:100%;min-height:0;display:flex;flex-direction:column;background:#090d14;color:#edf5ff;font:13px Inter,system-ui,sans-serif;overflow:hidden}
      .mcg-head{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid #ffffff12;background:#101722}
      .mcg-mark{width:40px;height:40px;border-radius:14px;background:linear-gradient(145deg,#2dd9ec,#1682c7);display:grid;place-items:center;color:#03131c}
      .mcg-head h2{margin:0;font-size:19px;letter-spacing:-.5px}.mcg-head p{margin:3px 0 0;color:#8fa4b9;font-size:11px}
      .mcg-actions{margin-left:auto;display:flex;gap:8px}.mcg-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid #ffffff1b;border-radius:999px;padding:9px 13px;background:#ffffff0a;color:#eaf5ff;cursor:pointer}.mcg-btn.primary{background:#20c5df;color:#06131b;border-color:transparent;font-weight:700}.mcg-btn:disabled{opacity:.45;cursor:wait}
      .mcg-toolbar{display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid #ffffff0d;flex-wrap:wrap}
      .mcg-tabs{display:flex;gap:5px}.mcg-tab{border:0;border-radius:999px;padding:8px 13px;background:transparent;color:#91a4b8;cursor:pointer}.mcg-tab.active{background:#1e3545;color:#a9f1ff}
      .mcg-search{margin-left:auto;display:flex;align-items:center;gap:8px;padding:0 12px;height:36px;border:1px solid #ffffff1a;border-radius:999px;background:#ffffff08;min-width:190px}.mcg-search input{border:0;outline:0;background:transparent;color:white;width:100%;min-width:0}
      .mcg-body{flex:1;min-height:0;overflow:auto;padding:18px}.mcg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:13px}
      .mcg-card{position:relative;min-width:0;border:1px solid #ffffff12;border-radius:15px;overflow:hidden;background:#121b27;text-align:left;color:inherit;cursor:pointer;padding:0}.mcg-thumb{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;background:#05080c}.mcg-card video{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;background:#05080c}.mcg-meta{display:block;padding:9px 10px}.mcg-name{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650}.mcg-sub{display:block;margin-top:4px;color:#8295aa;font-size:10px}.mcg-fav{position:absolute;right:8px;top:8px;width:30px;height:30px;border:0;border-radius:50%;background:#06101bbd;color:#fff;display:grid;place-items:center}
      .mcg-empty{min-height:240px;display:grid;place-content:center;text-align:center;color:#8da2b8;gap:8px}.mcg-empty strong{color:#eaf5ff;font-size:16px}
      .mcg-viewer{display:flex;flex-direction:column;height:100%;min-height:0}.mcg-viewtop{display:flex;align-items:center;gap:9px;margin-bottom:14px}.mcg-viewtop strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mcg-preview{flex:1;min-height:180px;display:grid;place-items:center;background:#05080d;border:1px solid #ffffff12;border-radius:18px;overflow:hidden}.mcg-preview img,.mcg-preview video{max-width:100%;max-height:100%;object-fit:contain}.mcg-viewfoot{display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:12px;color:#91a4b8;flex-wrap:wrap}
      .mcg-editor{position:absolute;inset:0;z-index:5;background:#070b12ed;backdrop-filter:blur(18px);display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:14px;padding:18px}.mcg-edit-preview{min-width:0;min-height:0;display:grid;place-items:center;background:#03060a;border-radius:16px;overflow:hidden}.mcg-edit-preview img{max-width:100%;max-height:100%;object-fit:contain}.mcg-edit-panel{min-width:0;display:flex;flex-direction:column;gap:12px;overflow:auto}.mcg-edit-panel h3{margin:0;font-size:17px}.mcg-edit-panel label{display:grid;gap:6px;color:#9eb0c3;font-size:11px}.mcg-edit-panel input,.mcg-edit-panel select{width:100%;border:1px solid #ffffff20;border-radius:9px;padding:10px;background:#111c2a;color:white}.mcg-edit-actions{display:flex;gap:7px;flex-wrap:wrap}.mcg-message{padding:8px 14px;color:#a4ecf5;font-size:11px}
      @media(max-width:680px){.mcg-head{padding:12px}.mcg-toolbar{padding:9px 12px}.mcg-body{padding:12px}.mcg-grid{grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:9px}.mcg-search{order:2;margin-left:0;width:100%}.mcg-editor{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) auto;padding:10px}.mcg-edit-panel{max-height:42vh}.mcg-actions .mcg-btn span{display:none}}
    `}</style>
    <header className="mcg-head"><div className="mcg-mark"><ImagePlus size={21}/></div><div><h2>Gallery</h2><p>Your photos and videos · stored on this device</p></div><div className="mcg-actions"><button className="mcg-btn primary" disabled={busy} onClick={() => inputRef.current?.click()}><Upload size={15}/><span>{busy ? "Importing…" : "Import"}</span></button></div></header>
    <div className="mcg-toolbar"><div className="mcg-tabs">
      {(["all","photo","video","favorites"] as const).map((key) => <button key={key} className={`mcg-tab ${filter===key?"active":""}`} onClick={() => {setFilter(key);setSelectedId(null);}}>{key==="all"?"All":key==="photo"?"Photos":key==="video"?"Videos":"Favorites"}</button>)}
    </div><label className="mcg-search"><Search size={15}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search your gallery"/></label></div>
    {notice && <div className="mcg-message">{notice}</div>}{error && <div className="mcg-message" role="alert" style={{color:"#ffb0b0"}}>{error}</div>}
    <div className="mcg-body">
      {selected ? <div className="mcg-viewer">
        <div className="mcg-viewtop"><button className="mcg-btn" onClick={()=>{setSelectedId(null);setEditOpen(false);}}><ArrowLeft size={15}/> Back</button><strong>{selected.name}</strong></div>
        <div className="mcg-preview">{selected.kind==="photo" ? <img src={selected.url} alt={selected.name}/> : <video src={selected.url} controls playsInline/>}</div>
        <div className="mcg-viewfoot"><span>{selected.kind==="photo"?"Photo":"Video"} · {formatSize(selected.size)} · {new Date(selected.createdAt).toLocaleDateString()}</span><div className="mcg-actions">
          <button className="mcg-btn" onClick={()=>void toggleFavorite(selected)}><Heart size={15} fill={selected.favorite?"currentColor":"none"}/></button>
          <button className="mcg-btn" onClick={()=>openEditor(selected)}><Edit3 size={15}/> Edit</button>
          <button className="mcg-btn" onClick={()=>download(selected)}><Download size={15}/> Download</button>
          <button className="mcg-btn" onClick={()=>void remove(selected)}><Trash2 size={15}/></button>
        </div></div>
      </div> : visible.length ? <div className="mcg-grid">{visible.map((item)=><button className="mcg-card" key={item.id} onClick={()=>setSelectedId(item.id)}>
        {item.kind==="photo" ? <img className="mcg-thumb" src={item.url} alt={item.name} loading="lazy"/> : <video src={item.url} muted playsInline preload="metadata"/>}
        {item.favorite && <span className="mcg-fav"><Heart size={14} fill="currentColor"/></span>}
        <span className="mcg-meta"><span className="mcg-name">{item.name}</span><span className="mcg-sub">{item.kind==="photo"?"Photo":"Video"} · {formatSize(item.size)}</span></span>
      </button>)}</div> : <div className="mcg-empty"><ImagePlus size={34}/><strong>{items.length?"No matching items":"Your gallery is empty"}</strong><span>Import photos and videos to keep them together here.</span><button className="mcg-btn primary" onClick={()=>inputRef.current?.click()}><Upload size={15}/> Import files</button></div>}
    </div>
    {editOpen && selected && <div className="mcg-editor">
      <div className="mcg-edit-preview">{selected.kind==="photo" ? <img src={selected.url} alt="Edit preview" style={{transform:`rotate(${rotation}deg)`,filter:imageFilter==="vivid"?"saturate(1.45) contrast(1.08)":imageFilter==="mono"?"grayscale(1)":imageFilter==="warm"?"sepia(.22) saturate(1.15)":"none"}}/> : <video src={selected.url} controls playsInline style={{maxWidth:"100%",maxHeight:"100%"}}/>}</div>
      <div className="mcg-edit-panel"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3>{selected.kind==="photo"?"Edit photo":"Edit video details"}</h3><button className="mcg-btn" onClick={()=>setEditOpen(false)}><X size={15}/></button></div>
        <label>File name<input value={editName} onChange={(e)=>setEditName(e.target.value)}/></label>
        {selected.kind==="photo" && <><label>Filter<select value={imageFilter} onChange={(e)=>setImageFilter(e.target.value as typeof imageFilter)}><option value="none">Original</option><option value="vivid">Vivid</option><option value="mono">Mono</option><option value="warm">Warm</option></select></label>
        <div className="mcg-edit-actions"><button className="mcg-btn" onClick={()=>setRotation((v)=>v-90)}><RotateCcw size={15}/> Rotate left</button><button className="mcg-btn" onClick={()=>setRotation((v)=>v+90)}><RotateCw size={15}/> Rotate right</button></div>
        <p style={{color:"#8295aa",fontSize:11,lineHeight:1.5}}>Photo edits are rendered and saved as a new version in your local Gallery.</p></>}
        {selected.kind==="video" && <p style={{color:"#8295aa",fontSize:11,lineHeight:1.5}}>You can rename the video here, preview it, and download the original video file. Video trimming and effects are not available in this version.</p>}
        <button className="mcg-btn primary" onClick={()=>void saveEdits()}><Check size={15}/> Save changes</button>
        <button className="mcg-btn" onClick={()=>{setRotation(0);setImageFilter("none");}}>Reset edits</button>
      </div>
    </div>}
    <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e)=>{if(e.target.files)void importFiles(e.target.files);e.currentTarget.value="";}}/>
    <canvas ref={canvasRef} hidden/>
  </div>;
}

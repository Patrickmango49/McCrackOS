import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Cpu, Headphones, LockKeyhole, MapPin, MonitorCog, Palette, Settings2, SlidersHorizontal, Sparkles, Sun, UnlockKeyhole, Volume2, VolumeX, X } from "lucide-react";
import type { Lang } from "../i18n";

export type WidgetId = "deck" | "media" | "updates" | "calendar" | "weather" | "resources" | "switches";
export type WidgetPosition = { x:number; y:number; width:number; height:number; scale:number };
export type WidgetStyle = "vertex" | "macos";
export type WidgetSkin = "mond" | "summit" | "default" | "bigsur";
type Props = {
  open: boolean; lang: Lang; hidden: string[]; locked: string[]; onToggleLocked: (id: WidgetId) => void; onToggleWidget: (id: WidgetId) => void; onShowAll: () => void; onHideAll: () => void;
  labels: boolean; onLabels: (v: boolean) => void; scale: number; onScale: (v: number) => void;
  side: "left" | "right"; onSide: (v: "left" | "right") => void; location: string; onLocation: (v: string) => void;
  clockVisible: boolean; onClockVisible: (v: boolean) => void; clockDraggable: boolean; onClockDraggable: (v: boolean) => void; style: WidgetStyle; onStyle: (v: WidgetStyle) => void;
  skin: WidgetSkin; onSkin: (v: WidgetSkin) => void; accent: string; onAccent: (v: string) => void; onClose: () => void;
};

export function MovableWidget({id,locked,position,onPositionChange,scale,labels,accent,children}:{id:string;locked:boolean;position?:WidgetPosition;onPositionChange:(id:string,position:WidgetPosition)=>void;scale:number;labels:boolean;accent:string;children:ReactNode}) {
  const drag=useRef<{pointerId:number;offsetX:number;offsetY:number;width:number;height:number;startX:number;startY:number}|null>(null);
  const moveListener=useRef<((event:PointerEvent)=>void)|null>(null),endListener=useRef<((event:PointerEvent)=>void)|null>(null);
  const suppressClickUntil=useRef(0);
  const [dragging,setDragging]=useState(false);
  const [portalRoot,setPortalRoot]=useState<HTMLElement|null>(null);
  const stop=()=>{if(moveListener.current)window.removeEventListener("pointermove",moveListener.current);if(endListener.current){window.removeEventListener("pointerup",endListener.current);window.removeEventListener("pointercancel",endListener.current);}moveListener.current=null;endListener.current=null;drag.current=null;setDragging(false);};
  useEffect(()=>()=>{if(moveListener.current)window.removeEventListener("pointermove",moveListener.current);if(endListener.current){window.removeEventListener("pointerup",endListener.current);window.removeEventListener("pointercancel",endListener.current);}},[]);
  useLayoutEffect(()=>{const root=document.querySelector<HTMLElement>(".desktop-shell.active")??document.querySelector<HTMLElement>(".desktop-shell");if(root)setPortalRoot(root);},[]);
  const start=(event:ReactPointerEvent<HTMLDivElement>)=>{
    const target=event.target as HTMLElement,hiddenLabelCard=!labels&&Boolean(target.closest(".side-card")),switchesCard=Boolean(target.closest(".desktop-widget--switches"));
    if(locked||event.button!==0||(target.closest("button,input,select,a")&&!hiddenLabelCard))return;
    const handle=target.closest(".desktop-widget-head,.side-label")||hiddenLabelCard||switchesCard;
    if(!handle)return;
    const card=target.closest<HTMLElement>("[data-widget-id]")??event.currentTarget;
    const bounds=card.getBoundingClientRect();if(!hiddenLabelCard&&!switchesCard&&event.clientY-bounds.top>44)return;
    const startPosition=position??{x:bounds.left,y:bounds.top,width:bounds.width,height:bounds.height,scale};
    drag.current={pointerId:event.pointerId,offsetX:event.clientX-bounds.left,offsetY:event.clientY-bounds.top,width:bounds.width,height:bounds.height,startX:event.clientX,startY:event.clientY};
    setDragging(true);
    let promoted=Boolean(position);
    let moved=false;
    const move=(next:PointerEvent)=>{const active=drag.current;if(!active||next.pointerId!==active.pointerId||Math.hypot(next.clientX-active.startX,next.clientY-active.startY)<3)return;moved=true;if(!promoted){promoted=true;onPositionChange(id,startPosition);}const x=Math.max(0,Math.min(window.innerWidth-active.width,next.clientX-active.offsetX));const y=Math.max(0,Math.min(window.innerHeight-active.height,next.clientY-active.offsetY));onPositionChange(id,{...startPosition,x,y,width:active.width,height:active.height,scale});};
    const end=(next:PointerEvent)=>{if(drag.current?.pointerId===next.pointerId){if(moved)suppressClickUntil.current=Date.now()+350;stop();}};
    moveListener.current=move;endListener.current=end;
    window.addEventListener("pointermove",move,{passive:false});window.addEventListener("pointerup",end);window.addEventListener("pointercancel",end);
  };
  const factor=scale/Math.max(.01,position?.scale??scale),displayWidth=position?(id==="switches"?140*scale:position.width*factor):0,displayHeight=position?(id==="switches"?102*scale:position.height*factor):0;
  const left=position?Math.max(0,Math.min(window.innerWidth-displayWidth,position.x)):0,top=position?Math.max(0,Math.min(window.innerHeight-displayHeight,position.y)):0;
  const surface=<div className={`widget-movable-surface${locked?" is-widget-locked":""}${!labels?" widget-labels-hidden":""}`} onPointerDown={start} onClick={event=>{if(Date.now()<suppressClickUntil.current){event.preventDefault();event.stopPropagation();}}}>{children}</div>;
  if(!position)return <div className="widget-movable-slot">{surface}</div>;
  const floating=<div className={`widget-movable-floating${!labels?" widget-labels-hidden":""}${dragging?" is-dragging":""}`} style={{left,top,width:id==="switches"?140:position.width/Math.max(.01,position.scale),transform:`scale(${scale})`,"--widget-scale":scale,"--widget-accent":accent} as CSSProperties}>
    <div className={`widget-movable-surface${locked?" is-widget-locked":""}${!labels?" widget-labels-hidden":""}`} onPointerDown={start} onClick={event=>{if(Date.now()<suppressClickUntil.current){event.preventDefault();event.stopPropagation();}}}>{children}</div>
  </div>;
  return <div className="widget-movable-slot is-floated" aria-hidden="true">{portalRoot?createPortal(floating,portalRoot):null}</div>;
}

const words = {
  en: { title:"Alternative",subtitle:"Shape your desktop workspace",widgets:"Widgets",settings:"Settings",style:"Style",help:"Choose what appears on your desktop.",all:"Show all",hideAll:"Hide all",clock:"Rainmeter clock",deck:"Game Deck",media:"Quick play",updates:"System status",calendar:"Calendar",weather:"Weather",resources:"System resources",switches:"Switches",sound:"System sound",volume:"Volume",mute:"Mute",headphones:"Headphones mode",drag:"Unlock dragging",unlocked:"Lock position",labels:"Show widget names",labelHelp:"Display headings and widget labels.",size:"Widget size",position:"Sidebar position",right:"Right",left:"Left",city:"Weather city",placeholder:"Enter a city (for example, New York)",save:"Save city",privacy:"The saved city is sent to Open-Meteo for a forecast lookup. Your device location is never requested.",desktop:"Desktop style",vertex:"McCrackOS",macos:"macOS 27 · Golden Gate",skin:"Clock skin",accent:"Accent color",close:"Close Alternative",choose:"Choose a city in Alternative → Settings to load a forecast.",loading:"Loading forecast…",error:"Could not load the forecast. Check the city or try again.",feels:"Feels like",humidity:"Humidity",wind:"Wind",cpu:"CPU threads",memory:"Device memory",heap:"App memory",appHeap:"APP HEAP",noEvents:"No events scheduled",unavailable:"Not exposed by this browser",today:"Today",skinNames:{mond:"Mond",summit:"Summit",default:"Default",bigsur:"Big Sur 26"}},
  es: { title:"Alternative",subtitle:"Personaliza tu escritorio",widgets:"Widgets",settings:"Settings",style:"Style",help:"Elige qué aparece en el escritorio.",all:"Mostrar todos",hideAll:"Ocultar todos",clock:"Reloj Rainmeter",deck:"Game Deck",media:"Reproducción rápida",updates:"Estado del sistema",calendar:"Calendario",weather:"Clima",resources:"Recursos del sistema",switches:"Controles",sound:"Sonido del sistema",volume:"Volumen",mute:"Silenciar",headphones:"Modo auriculares",drag:"Permitir arrastre",unlocked:"Fijar posición",labels:"Mostrar nombres de widgets",labelHelp:"Muestra encabezados y nombres.",size:"Tamaño de widgets",position:"Posición de la barra",right:"Derecha",left:"Izquierda",city:"Ciudad del clima",placeholder:"Escribe una ciudad (por ejemplo, Madrid)",save:"Guardar ciudad",privacy:"La ciudad guardada se envía a Open-Meteo para consultar el pronóstico. Nunca se solicita la ubicación del dispositivo.",desktop:"Estilo del escritorio",vertex:"McCrackOS",macos:"macOS 27 · Golden Gate",skin:"Estilo del reloj",accent:"Color de acento",close:"Cerrar Alternative",choose:"Elige una ciudad en Alternative → Settings para ver el pronóstico.",loading:"Cargando pronóstico…",error:"No se pudo cargar el pronóstico. Revisa la ciudad e inténtalo otra vez.",feels:"Sensación",humidity:"Humedad",wind:"Viento",cpu:"Hilos de CPU",memory:"Memoria del dispositivo",heap:"Memoria de la app",appHeap:"MEMORIA APP",noEvents:"No hay eventos",unavailable:"Este navegador no lo informa",today:"Hoy",skinNames:{mond:"Mond",summit:"Summit",default:"Predeterminado",bigsur:"Big Sur 26"}},
};
type Current = { temperature_2m:number; apparent_temperature:number; relative_humidity_2m:number; wind_speed_10m:number; weather_code:number; is_day:number };
type Daily = { time:string[]; weather_code:number[]; temperature_2m_max:number[]; temperature_2m_min:number[] };
type Weather = { place:string; current:Current; daily?:Daily };
function condition(code:number,es:boolean) { return code===0?(es?"Despejado":"Clear"):code<=3?(es?"Nublado":"Partly cloudy"):code<=48?(es?"Niebla":"Fog"):code<=57?(es?"Llovizna":"Drizzle"):code<=67?(es?"Lluvia":"Rain"):code<=77?(es?"Nieve":"Snow"):code<=82?(es?"Chubascos":"Showers"):code<=86?(es?"Nieve":"Snow showers"):es?"Tormenta":"Thunderstorm"; }
function ForecastIcon({code,size=15}:{code:number;size?:number}) { const Icon=code===0?Sun:code<=3?CloudSun:code<=48?CloudFog:code<=67?CloudRain:code<=77?CloudSnow:code<=82?CloudRain:CloudLightning;return <Icon size={size}/>; }
function WeatherCard({city,es}:{city:string;es:boolean}) {
  const [data,setData]=useState<Weather|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  useEffect(()=>{ if(!city.trim()){setData(null);setError(false);return;} const ctrl=new AbortController();let alive=true;setBusy(true);setError(false);
    (async()=>{try{const g=new URL("https://geocoding-api.open-meteo.com/v1/search");g.search=new URLSearchParams({name:city.trim(),count:"1",language:es?"es":"en",format:"json"}).toString();const gr=await fetch(g,{signal:ctrl.signal});if(!gr.ok)throw 0;const places=(await gr.json()).results;if(!places?.[0])throw 0;const p=places[0];const u=new URL("https://api.open-meteo.com/v1/forecast");u.search=new URLSearchParams({latitude:String(p.latitude),longitude:String(p.longitude),current:"temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day",daily:"weather_code,temperature_2m_max,temperature_2m_min",forecast_days:"5",timezone:"auto"}).toString();const fr=await fetch(u,{signal:ctrl.signal});if(!fr.ok)throw 0;const forecast=await fr.json() as {current:Current;daily?:Daily};if(alive)setData({place:[p.name,p.country].filter(Boolean).join(", "),current:forecast.current,daily:forecast.daily});}catch{if(alive&&!ctrl.signal.aborted)setError(true);}finally{if(alive)setBusy(false);}})();
    return()=>{alive=false;ctrl.abort();};
  },[city,es]);
  const w=words[es?"es":"en"];
  return <section data-widget-id="weather" className="desktop-widget desktop-widget--weather"><div className="desktop-widget-head"><Cloud size={15}/><strong>{w.weather}</strong></div>
    {!city?<p className="desktop-widget-muted">{w.choose}</p>:busy?<p className="desktop-widget-muted">{w.loading}</p>:error||!data?<p className="desktop-widget-muted">{w.error}</p>:<>
      <div className="weather-layout"><div className="weather-current"><span className="weather-place">{data.place}</span><div className="weather-main"><span className="weather-symbol"><ForecastIcon code={data.current.weather_code} size={25}/></span><strong>{Math.round(data.current.temperature_2m)}°</strong></div><div className="weather-condition">{condition(data.current.weather_code,es)}</div><div className="weather-current-meta">{w.feels} {Math.round(data.current.apparent_temperature)}°</div></div>
        <div className="weather-forecast">{data.daily?.time.slice(0,5).map((day,index)=>{const date=new Date(`${day}T12:00:00`),weekday=index===0?w.today:new Intl.DateTimeFormat(es?"es-ES":"en-US",{weekday:"short"}).format(date);return <div className="weather-forecast-row" key={day}><span>{weekday}</span><ForecastIcon code={data.daily?.weather_code[index]??0}/><span className="weather-forecast-temperatures"><b>{Math.round(data.daily?.temperature_2m_max[index]??0)}°</b><i>{Math.round(data.daily?.temperature_2m_min[index]??0)}°</i></span></div>;})}</div>
      </div>
    </>}</section>;
}
function CalendarCard({es}:{es:boolean}) {
  const [month,setMonth]=useState(()=>new Date()),today=new Date(),loc=es?"es-ES":"en-US",c=words[es?"es":"en"];
  const first=new Date(month.getFullYear(),month.getMonth(),1), offset=(first.getDay()+6)%7, count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const days=[...Array(offset).fill(0),...Array.from({length:count},(_,i)=>i+1)], title=new Intl.DateTimeFormat(loc,{month:"long",year:"numeric"}).format(month);
  const week=Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(loc,{weekday:"narrow"}).format(new Date(2024,0,i+1)));
  return <section data-widget-id="calendar" className="desktop-widget desktop-widget--calendar"><div className="desktop-widget-head"><CalendarDays size={15}/><strong>{c.calendar}</strong></div>
    <div className="calendar-layout"><div className="calendar-agenda"><strong className="calendar-day-number">{today.getDate()}</strong><span className="calendar-today-name">{new Intl.DateTimeFormat(loc,{weekday:"long"}).format(today)}</span><span className="calendar-agenda-empty">{c.noEvents}</span></div><div className="calendar-monthpane"><div className="calendar-month"><strong>{title}</strong><div><button aria-label="Previous month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft size={14}/></button><button aria-label="Next month" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight size={14}/></button></div></div>
      <div className="calendar-grid calendar-weekdays">{week.map((d,i)=><span key={i}>{d}</span>)}</div><div className="calendar-grid">{days.map((d,i)=>d?<span key={i} className={d===today.getDate()&&month.getMonth()===today.getMonth()&&month.getFullYear()===today.getFullYear()?"is-today":""}>{d}</span>:<span key={i}/>)}</div></div></div>
  </section>;
}
function ResourcesCard({es}:{es:boolean}) {
  const nav=typeof navigator==="undefined"?null:navigator as Navigator&{deviceMemory?:number};
  const readHeap=()=>typeof performance==="undefined"?undefined:(performance as Performance&{memory?:{usedJSHeapSize:number;jsHeapSizeLimit:number}}).memory;
  const [heap,setHeap]=useState(readHeap),w=words[es?"es":"en"],heapPercent=heap?Math.min(100,Math.round(heap.usedJSHeapSize/Math.max(1,heap.jsHeapSizeLimit)*100)):null;
  useEffect(()=>{const timer=window.setInterval(()=>setHeap(readHeap()),2000);return()=>window.clearInterval(timer);},[]);
  return <section data-widget-id="resources" className="desktop-widget desktop-widget--resources"><div className="desktop-widget-head"><Cpu size={15}/><strong>{w.resources}</strong></div>
    <div className="resource-layout"><div className="resource-gauge" style={{"--resource-progress":`${heapPercent??0}%`} as CSSProperties} role="img" aria-label={`${w.appHeap}: ${heapPercent===null?w.unavailable:heapPercent+"%"}`}><div className="resource-gauge-inner"><strong>{heapPercent===null?"—":`${heapPercent}%`}</strong><span>{w.appHeap}</span></div></div><div className="resource-metrics">
      <div className="resource-row"><span>{w.cpu}</span><strong>{nav?.hardwareConcurrency??w.unavailable}</strong></div>
      <div className="resource-row"><span>{w.memory}</span><strong>{nav?.deviceMemory?nav.deviceMemory+" GB":w.unavailable}</strong></div>
      <div className="resource-row"><span>{w.heap}</span><strong>{heap?Math.round(heap.usedJSHeapSize/1048576)+" MB":w.unavailable}</strong></div>
    </div></div>
    <p className="desktop-widget-note">{es?"Solo se muestran datos que el navegador permite consultar.":"Only data exposed by the browser is shown."}</p></section>;
}
type WidgetAudio = { on:boolean; vol:number; muted:boolean; output:"speakers"|"headphones" };
function readWidgetAudio():WidgetAudio {
  try { const value=JSON.parse(localStorage.getItem("vertex-sys-audio")||"null"); return {on:Boolean(value?.on),vol:typeof value?.vol==="number"?Math.max(0,Math.min(100,value.vol)):40,muted:Boolean(value?.muted),output:value?.output==="headphones"?"headphones":"speakers"}; } catch { return {on:false,vol:40,muted:false,output:"speakers"}; }
}
function SwitchesCard({es}:{es:boolean}) {
  const [audio,setAudio]=useState<WidgetAudio>(readWidgetAudio),w=words[es?"es":"en"];
  useEffect(()=>{const sync=(event:Event)=>{const detail=(event as CustomEvent<WidgetAudio>).detail;if(detail)setAudio(detail);};window.addEventListener("vertex-sys-audio-change",sync);return()=>window.removeEventListener("vertex-sys-audio-change",sync);},[]);
  const change=(patch:Partial<WidgetAudio>)=>{const next={...audio,...patch};setAudio(next);try{localStorage.setItem("vertex-sys-audio",JSON.stringify(next));}catch{}window.dispatchEvent(new CustomEvent("vertex-sys-audio-change",{detail:next}));};
  return <section data-widget-id="switches" className="desktop-widget desktop-widget--switches" aria-label={w.switches}>
    <div className="switches-layout"><div className="switches-volume"><input type="range" min="0" max="100" value={audio.muted?0:audio.vol} onChange={event=>change({vol:Number(event.target.value)})} aria-label={w.volume}/><button className={`switches-sound-toggle${audio.on?" is-on":""}`} type="button" title={w.sound} aria-label={w.sound} aria-pressed={audio.on} onClick={()=>change({on:!audio.on})}><Volume2 size={15}/></button></div>
      <div className="switches-controls"><button className={audio.output==="headphones"?"is-on":""} type="button" title={w.headphones} aria-label={w.headphones} aria-pressed={audio.output==="headphones"} onClick={()=>change({output:audio.output==="headphones"?"speakers":"headphones"})}><Headphones size={17}/></button><button className={audio.muted?"is-on":""} type="button" title={w.mute} aria-label={w.mute} aria-pressed={audio.muted} onClick={()=>change({muted:!audio.muted})}>{audio.muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button></div>
    </div>
  </section>;
}
export function DesktopWidgets({hidden,location,accent,lang,locked,labels,scale,positions,onPositionChange,onWidgetContext}:{hidden:string[];labels:boolean;location:string;accent:string;lang:Lang;locked:string[];scale:number;positions:Record<string,WidgetPosition>;onPositionChange:(id:string,position:WidgetPosition)=>void;onWidgetContext:(id:WidgetId,event:ReactMouseEvent<HTMLDivElement>)=>void}) {
  const es=lang==="es";
  const movable=(id:WidgetId,child:ReactNode)=><MovableWidget id={id} locked={locked.includes(id)} position={positions[id]} onPositionChange={onPositionChange} scale={scale} labels={labels} accent={accent}>{child}</MovableWidget>;
  return <div className="desktop-widgets-extra" style={{"--widget-accent":accent} as CSSProperties} onContextMenu={event=>{const card=(event.target as HTMLElement).closest<HTMLElement>("[data-widget-id]");const id=card?.dataset.widgetId as WidgetId|undefined;if(id)onWidgetContext(id,event);}}>
    {!hidden.includes("calendar")?movable("calendar",<CalendarCard es={es}/>):null}{!hidden.includes("weather")?movable("weather",<WeatherCard city={location} es={es}/>):null}{!hidden.includes("resources")?movable("resources",<ResourcesCard es={es}/>):null}{!hidden.includes("switches")?movable("switches",<SwitchesCard es={es}/>):null}
  </div>;
}
export function AlternativePanel(p:Props) {
  const {open,lang,hidden,locked,onToggleLocked,onToggleWidget,onShowAll,onHideAll,labels,onLabels,scale,onScale,side,onSide,location,onLocation,clockVisible,onClockVisible,clockDraggable,onClockDraggable,style,onStyle,skin,onSkin,accent,onAccent,onClose}=p;
  const [tab,setTab]=useState<"widgets"|"settings"|"style">("widgets"),[draft,setDraft]=useState(location),es=lang==="es",w=words[es?"es":"en"];
  const items:{id:WidgetId;name:string}[]=[{id:"deck",name:w.deck},{id:"media",name:w.media},{id:"updates",name:w.updates},{id:"calendar",name:w.calendar},{id:"weather",name:w.weather},{id:"resources",name:w.resources},{id:"switches",name:w.switches}];
  useEffect(()=>{if(open)setDraft(location);},[open,location]);if(!open)return null;
  return <div className="alternative-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="alternative-panel" role="dialog" aria-modal="true" aria-labelledby="alternative-title">
    <header className="alternative-header"><div><span className="alternative-kicker"><Sparkles size={13}/> MCCRACKOS WORKSPACE</span><h2 id="alternative-title">{w.title}</h2><p>{w.subtitle}</p></div><button className="alternative-close" onClick={onClose} aria-label={w.close}><X size={18}/></button></header>
    <nav className="alternative-tabs" aria-label="Alternative settings">
      <button className={tab==="widgets"?"active":""} onClick={()=>setTab("widgets")}><SlidersHorizontal size={15}/>{w.widgets}</button><button className={tab==="settings"?"active":""} onClick={()=>setTab("settings")}><Settings2 size={15}/>{w.settings}</button><button className={tab==="style"?"active":""} onClick={()=>setTab("style")}><Palette size={15}/>{w.style}</button>
    </nav><div className="alternative-content">
      {tab==="widgets"?<div className="alternative-widget-list"><div className="alternative-section-heading"><div><strong>{w.widgets}</strong><p>{w.help}</p></div><div className="alternative-widget-actions"><button className="alternative-text-button" onClick={onShowAll}>{w.all}</button><button className="alternative-text-button" onClick={onHideAll}>{w.hideAll}</button></div></div>
        <div className="alternative-widget-row"><label className="alternative-widget-toggle"><span><MonitorCog size={16}/><strong>{w.clock}</strong></span><input type="checkbox" checked={clockVisible} onChange={e=>onClockVisible(e.target.checked)}/></label><button className="alternative-lock" type="button" aria-label={clockDraggable?w.unlocked:w.drag} title={clockDraggable?w.unlocked:w.drag} onClick={()=>onClockDraggable(!clockDraggable)}>{clockDraggable?<UnlockKeyhole size={14}/>:<LockKeyhole size={14}/>}</button></div>
        {items.map(it=><div key={it.id} className="alternative-widget-row"><label className="alternative-widget-toggle"><span>{it.id==="calendar"?<CalendarDays size={16}/>:it.id==="weather"?<Cloud size={16}/>:it.id==="resources"?<Cpu size={16}/>:it.id==="switches"?<SlidersHorizontal size={16}/>:<Sparkles size={16}/>}<strong>{it.name}</strong></span><input type="checkbox" checked={!hidden.includes(it.id)} onChange={()=>onToggleWidget(it.id)}/></label><button className="alternative-lock" type="button" aria-label={locked.includes(it.id)?w.drag:w.unlocked} title={locked.includes(it.id)?w.drag:w.unlocked} onClick={()=>onToggleLocked(it.id)}>{locked.includes(it.id)?<LockKeyhole size={14}/>:<UnlockKeyhole size={14}/>}</button></div>)}
      </div>:null}
      {tab==="settings"?<div className="alternative-settings">
        <label className="alternative-switch"><span><strong>{w.labels}</strong><small>{w.labelHelp}</small></span><input type="checkbox" checked={labels} onChange={e=>onLabels(e.target.checked)}/></label>
        <label className="alternative-range"><span><strong>{w.size}</strong><b>{Math.round(scale*100)}%</b></span><input type="range" min="0.75" max="1.25" step="0.05" value={scale} onChange={e=>onScale(Number(e.target.value))}/></label>
        <label className="alternative-field"><strong>{w.position}</strong><select value={side} onChange={e=>onSide(e.target.value as "left"|"right")}><option value="right">{w.right}</option><option value="left">{w.left}</option></select></label>
        <form className="alternative-city" onSubmit={e=>{e.preventDefault();onLocation(draft.trim());}}><label htmlFor="alternative-city"><strong><MapPin size={15}/>{w.city}</strong><input id="alternative-city" value={draft} onChange={e=>setDraft(e.target.value)} placeholder={w.placeholder}/></label><button type="submit">{w.save}</button><small>{w.privacy}</small></form>
      </div>:null}
      {tab==="style"?<div className="alternative-style"><div className="alternative-section-heading"><div><strong>{w.desktop}</strong><p>{es?"Barra superior, ventanas y fondo.":"Menu bar, windows and wallpaper."}</p></div></div>
        <div className="alternative-style-choices"><button className={style==="vertex"?"selected":""} onClick={()=>onStyle("vertex")}><span className="alternative-style-preview vertex-preview"><i/><i/><i/></span><strong>{w.vertex}</strong></button><button className={style==="macos"?"selected":""} onClick={()=>onStyle("macos")}><span className="alternative-style-preview macos-preview">●</span><strong>{w.macos}</strong></button></div>
        <label className="alternative-field"><strong>{w.skin}</strong><select value={skin} onChange={e=>onSkin(e.target.value as WidgetSkin)}>{(["mond","summit","default","bigsur"] as WidgetSkin[]).map(n=><option key={n} value={n}>{w.skinNames[n]}</option>)}</select></label>
        <label className="alternative-color"><strong>{w.accent}</strong><input type="color" value={accent} onChange={e=>onAccent(e.target.value)}/></label>
      </div>:null}
    </div>
  </section></div>;
}

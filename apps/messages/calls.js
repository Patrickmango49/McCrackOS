/* McCrack Chat — 1:1 voice and video calling.
   Signalling is stored in Supabase; WebRTC carries live media peer-to-peer.
   Configure TURN_SERVERS below if you want relay support on restrictive networks. */
(function(){
"use strict";
const api=window.McCrackChat;
if(!api||!api.db)return;
const {db,$,toast}=api;
const ICE_SERVERS=[
 {urls:"stun:stun.l.google.com:19302"},
 {urls:"stun:stun1.l.google.com:19302"}
];
// Optional TURN server example (use short-lived credentials from your TURN provider):
// ICE_SERVERS.push({urls:"turn:turn.example.com:3478",username:"TEMP_USERNAME",credential:"TEMP_PASSWORD"});
const call={
 user:null,session:null,pc:null,localStream:null,remoteStream:null,channel:null,
 seen:new Set(),pendingIce:[],poll:null,incomingPoll:null,durationTimer:null,
 startedAt:0,muted:false,cameraOff:false,handling:false,ending:false,mode:"video",
 incoming:null,lastIncomingId:null
};
const audio=document.createElement("audio");audio.id="remoteCallAudio";audio.autoplay=true;audio.playsInline=true;audio.style.display="none";$("activeCallOverlay").append(audio);
function setText(id,value){const el=$(id);if(el)el.textContent=value}
function initials(name){return String(name||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"?"}
function currentUser(){return call.user||api.state.user||null}
function setCallButtons(){const active=!!(currentUser()&&$("dmHeaderName")&&$("dmHeaderName").textContent.trim()!=="Choose a friend");["startVoiceCall","startVideoCall"].forEach(id=>{const b=$(id);if(b)b.disabled=!active||!!call.session})}
function showIncoming(row,profile){call.incoming=row;call.lastIncomingId=row.id;setText("incomingCallTitle",profile?.display_name||profile?.username||"Incoming call");setText("incomingCallSubtitle",(row.mode==="video"?"Video call":"Voice call")+" · "+(profile?.username?"@"+profile.username:"McCrack Chat"));$("incomingCallOverlay").classList.add("open")}
function hideIncoming(){$("incomingCallOverlay").classList.remove("open")}
function updateCallStatus(text){setText("callStatusText",text)}
function setCallMode(mode){call.mode=mode;const voice=mode==="voice";$("remoteCallVideo").hidden=voice;$("localCallVideo").hidden=voice;setText("remoteCallHint",voice?"Voice call connected":"Waiting for video…")}
function showActive(profile){
 $("activeCallOverlay").classList.add("open");$("remoteCallVideo").hidden=call.mode==="voice";$("localCallVideo").hidden=call.mode==="voice";
 $("remoteCallVideo").srcObject=null;audio.srcObject=null;
 setText("remoteCallName",profile?.display_name||profile?.username||"Friend");$("remoteCallAvatar").textContent=initials(profile?.display_name||profile?.username);
 $("remoteCallPlaceholder").hidden=false;updateCallStatus("Connecting…");setText("callDuration","00:00");
}
async function getProfile(id){const {data}=await db.from("profiles").select("username,display_name,avatar_url").eq("id",id).maybeSingle();return data||null}
async function signal(type,payload){
 if(!call.session||!currentUser())return;
 const other=call.session.caller_id===currentUser().id?call.session.callee_id:call.session.caller_id;
 const {error}=await db.from("call_signals").insert({call_id:call.session.id,sender_id:currentUser().id,recipient_id:other,type,payload:payload||{}});
 if(error)throw error;
}
async function createPeer(){
 if(call.pc)try{call.pc.close()}catch(e){}
 call.pc=new RTCPeerConnection({iceServers:ICE_SERVERS});
 call.remoteStream=new MediaStream();
 $("remoteCallVideo").srcObject=call.remoteStream;audio.srcObject=call.remoteStream;
 call.pc.ontrack=e=>{
  const stream=e.streams&&e.streams[0];
  if(stream){call.remoteStream=stream;$("remoteCallVideo").srcObject=stream;audio.srcObject=stream}
  else if(e.track&&!call.remoteStream.getTracks().some(t=>t.id===e.track.id)){call.remoteStream.addTrack(e.track)}
  const hasVideo=call.remoteStream.getVideoTracks().some(t=>t.readyState==="live");
  if(hasVideo&&call.mode==="video")$("remoteCallPlaceholder").hidden=true;
  if(call.mode==="voice")$("remoteCallPlaceholder").hidden=false;
  $("remoteCallVideo").play().catch(()=>{});audio.play().catch(()=>{});
 };
 call.pc.onicecandidate=e=>{if(e.candidate)signal("ice",e.candidate.toJSON()).catch(err=>toast("Call connection signal failed: "+err.message,true))};
 call.pc.onconnectionstatechange=()=>{
  const s=call.pc?.connectionState;
  if(s==="connected"){updateCallStatus("Connected");startDuration()}
  else if(s==="connecting"||s==="new")updateCallStatus("Connecting…");
  else if(s==="disconnected")updateCallStatus("Reconnecting…");
  else if(s==="failed"){updateCallStatus("Connection failed");toast("Could not establish the call. A TURN relay may be needed on this network.",true);endCall(true)}
 };
 call.pc.oniceconnectionstatechange=()=>{if(call.pc?.iceConnectionState==="disconnected")updateCallStatus("Reconnecting…")};
 if(call.localStream){
  const tracks=call.localStream.getTracks();
  tracks.forEach(t=>call.pc.addTrack(t,call.localStream));
  const hasAudio=tracks.some(t=>t.kind==="audio");
  const hasVideo=tracks.some(t=>t.kind==="video");
  if(!hasAudio)call.pc.addTransceiver("audio",{direction:"recvonly"});
  if(call.mode==="video"&&!hasVideo)call.pc.addTransceiver("video",{direction:"recvonly"});
 }else{
  call.pc.addTransceiver("audio",{direction:"recvonly"});
  if(call.mode==="video")call.pc.addTransceiver("video",{direction:"recvonly"});
 }
}
async function acquireMedia(mode){
 const constraints={audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:mode==="video"?{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30},facingMode:"user"}:false};
 return navigator.mediaDevices.getUserMedia(constraints);
}
function mediaErrorMessage(e,mode){
 if(e?.name==="NotFoundError"||e?.name==="DevicesNotFoundError")return mode==="video"?"No microphone or camera was found on this device. Connect a microphone and camera, or try a voice call if a microphone is available.":"No microphone was found on this device. Connect a microphone to make a voice call.";
 if(e?.name==="NotAllowedError"||e?.name==="PermissionDeniedError")return "Microphone/camera permission was blocked. Allow access in your browser's site settings, then try again.";
 if(e?.name==="NotReadableError"||e?.name==="TrackStartError")return "Your microphone or camera is already being used by another app, or the device could not be started.";
 if(e?.name==="OverconstrainedError")return "The selected microphone or camera doesn't support the requested settings.";
 if(e?.name==="SecurityError")return "Calls need a secure HTTPS connection and microphone/camera permissions.";
 return e?.message||"Check your microphone and camera permissions.";
}
async function startDuration(){
 if(call.durationTimer)return;
 call.startedAt=Date.now();
 call.durationTimer=setInterval(()=>{const n=Math.floor((Date.now()-call.startedAt)/1000);setText("callDuration",String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0"))},1000);
}
function stopDuration(){clearInterval(call.durationTimer);call.durationTimer=null}
async function processSignal(s){
 if(!s||call.seen.has(s.id)||s.recipient_id!==currentUser()?.id)return;
 call.seen.add(s.id);
 try{
  if(s.type==="offer"){
   if(!call.pc)await createPeer();
   if(!call.pc.currentRemoteDescription)await call.pc.setRemoteDescription(new RTCSessionDescription(s.payload));
   for(const c of call.pendingIce.splice(0))await call.pc.addIceCandidate(new RTCIceCandidate(c));
   const answer=await call.pc.createAnswer();await call.pc.setLocalDescription(answer);await signal("answer",call.pc.localDescription.toJSON());
  }else if(s.type==="answer"){
   if(call.pc&&!call.pc.currentRemoteDescription){await call.pc.setRemoteDescription(new RTCSessionDescription(s.payload));for(const c of call.pendingIce.splice(0))await call.pc.addIceCandidate(new RTCIceCandidate(c))}
  }else if(s.type==="ice"){
   if(call.pc?.remoteDescription)await call.pc.addIceCandidate(new RTCIceCandidate(s.payload));
   else call.pendingIce.push(s.payload);
  }else if(s.type==="hangup"||s.type==="reject"){
   cleanup(false);toast(s.type==="reject"?"Call declined":"Call ended");
  }
 }catch(e){console.warn("Call signal handling:",e);toast("A call connection step failed: "+(e.message||"unknown error"),true)}
}
async function syncSignals(){
 if(!call.session||!currentUser())return;
 const {data,error}=await db.from("call_signals").select("*").eq("call_id",call.session.id).order("created_at",{ascending:true}).limit(250);
 if(error){console.warn("Call signal sync:",error.message);return}
 for(const s of data||[])await processSignal(s);
}
function subscribeSignals(){
 if(call.channel)db.removeChannel(call.channel);
 call.channel=db.channel("call-signals-"+call.session.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"call_signals",filter:"call_id=eq."+call.session.id},payload=>processSignal(payload.new)).subscribe(status=>{if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")console.warn("Call realtime channel:",status)});
 call.seen.clear();call.pendingIce=[];
 syncSignals();
 if(call.signalPoll)clearInterval(call.signalPoll);
 call.signalPoll=setInterval(syncSignals,1400);
}
async function startCall(mode){
 if(!currentUser()||!api.state.user){toast("Sign in before calling.",true);return}
 const otherName=$("dmHeaderName").textContent.trim();
 if(!otherName||otherName==="Choose a friend"){toast("Open a private conversation with a friend first.",true);return}
 if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){toast("This browser does not support WebRTC calls. Use a modern browser over HTTPS.",true);return}
 if(call.session){toast("You're already in a call.",true);return}
 const friend=api.state.user&&$("dmHeaderName").textContent.trim();
 // Resolve the friend from the currently open private conversation.
 const activeDM=window.McCrackChatDM;
 const match=activeDM?.conversation;
 const calleeId=activeDM?.friend?.id;
 if(!match||!calleeId){toast("Open a private conversation with a friend first.",true);return}
 try{
  // Check local devices and permissions before creating an invitation in Supabase.
  call.localStream=await acquireMedia(mode);
  const {data:row,error}=await db.from("call_sessions").insert({conversation_id:match.id,caller_id:currentUser().id,callee_id:calleeId,mode,status:"ringing"}).select("*").single();
  if(error)throw error;
  call.session=row;call.mode=mode;setCallButtons();setCallMode(mode);
  const profile=await getProfile(calleeId);showActive(profile);updateCallStatus("Calling…");
  $("localCallVideo").srcObject=call.localStream;
  await createPeer();const offer=await call.pc.createOffer();await call.pc.setLocalDescription(offer);subscribeSignals();await signal("offer",call.pc.localDescription.toJSON());
  toast("Calling "+(profile?.display_name||profile?.username||"friend")+"…");
  if(call.statusPoll)clearInterval(call.statusPoll);
  call.statusPoll=setInterval(checkActiveSession,1800);
  setTimeout(()=>{if(call.session?.id===row.id&&call.session.status==="ringing"){db.from("call_sessions").update({status:"missed",ended_at:new Date().toISOString()}).eq("id",row.id);cleanup(false);toast("No answer")}},45000);
 }catch(e){console.error(e);if(call.session)await db.from("call_sessions").update({status:"ended",ended_at:new Date().toISOString()}).eq("id",call.session.id);toast("Could not start call: "+mediaErrorMessage(e,mode),true);cleanup(false)}
}
async function checkActiveSession(){
 if(!call.session)return;
 const {data,error}=await db.from("call_sessions").select("status").eq("id",call.session.id).maybeSingle();
 if(error||!data)return;
 if(data.status==="accepted"){call.session.status="accepted";return}
 if(["declined","ended","missed","cancelled"].includes(data.status)){const status=data.status;cleanup(false);toast(status==="declined"?"Call declined":status==="missed"?"No answer":"Call ended")}
}
async function acquireAvailableMedia(mode){
 const missing=[];
 try{return {stream:await acquireMedia(mode),missing:[]}}catch(e){
  if(e?.name!=="NotFoundError"&&e?.name!=="DevicesNotFoundError")throw e;
 }
 if(mode==="video"){
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});missing.push("camera");return {stream,missing}}catch(e){
   if(e?.name!=="NotFoundError"&&e?.name!=="DevicesNotFoundError")throw e;
  }
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:1280},height:{ideal:720},facingMode:"user"}});missing.push("microphone");return {stream,missing}}catch(e){
   if(e?.name!=="NotFoundError"&&e?.name!=="DevicesNotFoundError")throw e;
  }
  return {stream:null,missing:["microphone","camera"]};
 }
 return {stream:null,missing:["microphone"]};
}
async function acceptIncoming(){
 const row=call.incoming;if(!row||call.session)return;
 hideIncoming();call.session=row;call.mode=row.mode||"video";setCallMode(call.mode);
 try{
  // Accept with whichever local devices exist; receive-only media keeps the call usable without them.
  const available=await acquireAvailableMedia(call.mode);
  call.localStream=available.stream;
  const {error}=await db.from("call_sessions").update({status:"accepted",accepted_at:new Date().toISOString()}).eq("id",row.id).eq("status","ringing");
  if(error)throw error;
  const profile=await getProfile(row.caller_id);showActive(profile);
  $("localCallVideo").srcObject=call.localStream;
  await createPeer();subscribeSignals();await syncSignals();
  if(available.missing.length){
   const missing=available.missing.join(" and ");
   toast("Call connected, but no "+missing+" "+(available.missing.length===1?"is":"are")+" connected on this device.",true);
  }
  if(call.statusPoll)clearInterval(call.statusPoll);call.statusPoll=setInterval(checkActiveSession,1800);
 }catch(e){console.error(e);toast("Could not answer call: "+mediaErrorMessage(e,call.mode),true);await db.from("call_sessions").update({status:"ended",ended_at:new Date().toISOString()}).eq("id",row.id);cleanup(false)}
 call.incoming=null;
}
async function declineIncoming(){
 const row=call.incoming;hideIncoming();call.incoming=null;
 if(row)await db.from("call_sessions").update({status:"declined",ended_at:new Date().toISOString()}).eq("id",row.id);
}
async function endCall(remote){
 const row=call.session;if(!row)return;
 if(!remote){try{await signal("hangup",{})}catch(e){}await db.from("call_sessions").update({status:"ended",ended_at:new Date().toISOString()}).eq("id",row.id)}
 cleanup(false);
}
function cleanup(showToast){
 stopDuration();if(call.signalPoll)clearInterval(call.signalPoll);call.signalPoll=null;
 if(call.statusPoll)clearInterval(call.statusPoll);call.statusPoll=null;
 if(call.channel){db.removeChannel(call.channel);call.channel=null}
 if(call.pc){call.pc.ontrack=null;call.pc.onicecandidate=null;call.pc.onconnectionstatechange=null;try{call.pc.close()}catch(e){}}
 call.pc=null;
 if(call.localStream){call.localStream.getTracks().forEach(t=>t.stop());call.localStream=null}
 if(call.remoteStream){call.remoteStream.getTracks().forEach(t=>t.stop());call.remoteStream=null}
 $("localCallVideo").srcObject=null;$("remoteCallVideo").srcObject=null;audio.srcObject=null;
 $("activeCallOverlay").classList.remove("open");hideIncoming();
 call.session=null;call.seen.clear();call.pendingIce=[];call.muted=false;call.cameraOff=false;call.incoming=null;
 $("toggleCallMute").classList.remove("active");$("toggleCallCamera").classList.remove("active");
 $("toggleCallMute").innerHTML='<i class="fa-solid fa-microphone"></i>';$("toggleCallCamera").innerHTML='<i class="fa-solid fa-video"></i>';
 setCallButtons();if(showToast)toast("Call ended");
}
async function pollIncoming(){
 if(!currentUser()||call.session)return;
 if(call.incoming){const {data:active}=await db.from("call_sessions").select("status").eq("id",call.incoming.id).maybeSingle();if(!active||active.status!=="ringing"){hideIncoming();call.incoming=null}return}
 const {data,error}=await db.from("call_sessions").select("*").eq("callee_id",currentUser().id).eq("status","ringing").order("created_at",{ascending:false}).limit(1);
 if(error){if(!/relation .* does not exist/i.test(error.message||""))console.warn("Incoming call check:",error.message);return}
 const row=data&&data[0];if(!row||row.id===call.lastIncomingId)return;
 const profile=await getProfile(row.caller_id);showIncoming(row,profile);
}
function toggleMute(){
 if(!call.localStream)return;call.muted=!call.muted;
 call.localStream.getAudioTracks().forEach(t=>t.enabled=!call.muted);
 $("toggleCallMute").classList.toggle("active",call.muted);
 $("toggleCallMute").innerHTML=call.muted?'<i class="fa-solid fa-microphone-slash"></i>':'<i class="fa-solid fa-microphone"></i>';
 $("toggleCallMute").title=call.muted?"Unmute microphone":"Mute microphone";
}
function toggleCamera(){
 if(!call.localStream||!call.localStream.getVideoTracks().length){toast("No camera is active in this call.",true);return}
 call.cameraOff=!call.cameraOff;call.localStream.getVideoTracks().forEach(t=>t.enabled=!call.cameraOff);
 $("toggleCallCamera").classList.toggle("active",call.cameraOff);
 $("toggleCallCamera").innerHTML=call.cameraOff?'<i class="fa-solid fa-video-slash"></i>':'<i class="fa-solid fa-video"></i>';
 $("toggleCallCamera").title=call.cameraOff?"Turn camera on":"Turn camera off";
}
function init(){
 $("startVoiceCall").addEventListener("click",()=>startCall("voice").catch(e=>toast(e.message||"Could not start voice call",true)));
 $("startVideoCall").addEventListener("click",()=>startCall("video").catch(e=>toast(e.message||"Could not start video call",true)));
 $("acceptIncomingCall").addEventListener("click",acceptIncoming);$("declineIncomingCall").addEventListener("click",declineIncoming);
 $("endActiveCall").addEventListener("click",()=>endCall(false));$("toggleCallMute").addEventListener("click",toggleMute);$("toggleCallCamera").addEventListener("click",toggleCamera);
 const head=$("dmHeaderName");if(head)new MutationObserver(setCallButtons).observe(head,{childList:true,subtree:true,characterData:true});
 const refreshAuth=async()=>{const {data}=await db.auth.getSession();call.user=data?.session?.user||null;setCallButtons();if(call.user){if(call.incomingPoll)clearInterval(call.incomingPoll);pollIncoming();call.incomingPoll=setInterval(pollIncoming,2400)}else{if(call.incomingPoll)clearInterval(call.incomingPoll);call.incomingPoll=null;cleanup(false)}};
 db.auth.onAuthStateChange((_event,session)=>{call.user=session?.user||null;setCallButtons();if(call.user)pollIncoming();else cleanup(false)});
 refreshAuth();
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)pollIncoming()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
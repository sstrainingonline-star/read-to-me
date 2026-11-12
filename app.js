(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const cfg = window.READ_TO_ME_CONFIG || {};
  let client, account, stream = null, lastText = "", voices = [], currentUser = null, isAdmin = false;
  const loginView=$("loginView"), readerView=$("readerView"), adminView=$("adminView");
  const say = (text, target="speechStatus") => { const el=$(target); if(el) el.textContent=text; };
  const show = view => { [loginView,readerView,adminView].forEach(v=>v.classList.add("hidden")); view.classList.remove("hidden"); $("logoutBtn").classList.toggle("hidden", view===loginView); };
  const ready = () => cfg.enabled && cfg.projectId && !cfg.projectId.startsWith("YOUR_") && window.Appwrite;
  if (ready()) { client=new Appwrite.Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId); account=new Appwrite.Account(client); }

  function loadVoices(){
    if(!("speechSynthesis" in window)){ $("voiceSelect").innerHTML="<option>Speech is not supported by this browser</option>"; return; }
    voices=window.speechSynthesis.getVoices();
    const select=$("voiceSelect"), previous=localStorage.getItem("rtmVoice")||"";
    select.innerHTML="";
    const english=voices.filter(v=>/^en(-|_)/i.test(v.lang));
    const choices=english.length?english:voices;
    if(!choices.length){select.innerHTML="<option>Waiting for phone voices…</option>";return;}
    choices.forEach(v=>{const o=document.createElement("option");o.value=v.voiceURI;o.textContent=`${v.name} (${v.lang})${v.default?" · default":""}`;select.appendChild(o);});
    if(choices.some(v=>v.voiceURI===previous))select.value=previous;
    else {const preferred=choices.find(v=>/^en-GB/i.test(v.lang))||choices.find(v=>v.default)||choices[0];if(preferred)select.value=preferred.voiceURI;}
  }
  if("speechSynthesis" in window){loadVoices();speechSynthesis.onvoiceschanged=loadVoices;}
  $("voiceSelect").addEventListener("change",()=>localStorage.setItem("rtmVoice",$("voiceSelect").value));
  $("rateRange").addEventListener("input",e=>$("rateValue").textContent=Number(e.target.value).toFixed(2).replace(/0$/,"")+"×");
  function speak(text){
    if(!("speechSynthesis" in window)){say("Your browser does not support built-in speech.");return;}
    const clean=(text||"").trim(); if(!clean){say("There is no text to read yet.");return;}
    speechSynthesis.cancel(); const utterance=new SpeechSynthesisUtterance(clean);
    const voice=voices.find(v=>v.voiceURI===$("voiceSelect").value); if(voice)utterance.voice=voice;
    utterance.rate=Number($("rateRange").value); utterance.pitch=1; utterance.volume=1;
    utterance.onstart=()=>say("Reading aloud…"); utterance.onend=()=>say("Finished reading."); utterance.onerror=()=>say("Speech stopped or could not start. Try another voice.");
    speechSynthesis.speak(utterance); lastText=clean;
  }
  $("readBtn").onclick=()=>speak($("readingText").value);
  $("previewVoice").onclick=()=>speak("Hello. This is a preview of the selected reading voice.");
  $("pauseBtn").onclick=()=>{if("speechSynthesis"in window&&speechSynthesis.speaking){speechSynthesis.pause();say("Reading paused.");}};
  $("resumeBtn").onclick=()=>{if("speechSynthesis"in window&&speechSynthesis.paused){speechSynthesis.resume();say("Reading resumed.");}};
  $("stopBtn").onclick=()=>{if("speechSynthesis"in window)speechSynthesis.cancel();say("Reading stopped.");};
  $("replayBtn").onclick=()=>speak(lastText||$("readingText").value);
  $("clearBtn").onclick=()=>{$("readingText").value="";lastText="";if("speechSynthesis"in window)speechSynthesis.cancel();say("Text cleared.");};
  async function recognize(file){
    if(!window.Tesseract){say("OCR engine could not load. Check your internet connection.","ocrStatus");return;}
    say("Reading the image… keep this page open.","ocrStatus");
    try{
      const result=await Tesseract.recognize(file,"eng",{logger:m=>{if(m.status==="recognizing text")say(`Recognising text: ${Math.round((m.progress||0)*100)}%`,"ocrStatus");}});
      const text=(result.data.text||"").replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
      $("readingText").value=text;
      say(text?"Text recognised. Check it carefully before listening.":"No clear text found. Try a brighter, sharper photo.","ocrStatus");
    }catch(e){say("Could not read this image. Try another photo with better lighting.","ocrStatus");}
  }
  $("imageUpload").addEventListener("change",e=>{const f=e.target.files&&e.target.files[0];if(f)recognize(f);e.target.value="";});
  async function openCamera(){
    if(!navigator.mediaDevices?.getUserMedia){say("Camera access is not supported here. Use photo upload instead.","ocrStatus");return;}
    try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});$("camera").srcObject=stream;$("cameraPlaceholder").classList.add("hidden");$("capturePhoto").disabled=false;$("stopCamera").disabled=false;$("startCamera").disabled=true;say("Camera ready. Position the text and capture a photo.","ocrStatus");}
    catch(e){say("Camera permission was not granted or the camera is unavailable. You can upload a photo instead.","ocrStatus");}
  }
  function closeCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;} $("camera").srcObject=null;$("cameraPlaceholder").classList.remove("hidden");$("capturePhoto").disabled=true;$("stopCamera").disabled=true;$("startCamera").disabled=false;}
  $("startCamera").onclick=openCamera;$("stopCamera").onclick=closeCamera;
  $("capturePhoto").onclick=()=>{const v=$("camera"),c=$("captureCanvas");if(!v.videoWidth){say("Wait for the camera preview to appear.","ocrStatus");return;}c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);c.toBlob(blob=>{if(blob)recognize(blob);},"image/jpeg",.92);};
  window.addEventListener("pagehide",closeCamera);

  async function login(studentId, code, temporary=false){
    if(!ready()){throw new Error("Appwrite is not configured yet. Follow the README setup steps, then try again.");}
    // Authentication is delegated to the secure Appwrite Function. No code is validated in browser JavaScript.
    const res=await fetch(`${cfg.endpoint}/functions/${cfg.functionId}/executions`,{
      method:"POST",headers:{"Content-Type":"application/json","X-Appwrite-Project":cfg.projectId},
      body:JSON.stringify({body:JSON.stringify({action:"login",studentId,code,temporary}),async:false})
    });
    const data=await res.json(); if(!res.ok||data.status==="failed")throw new Error(data.response||"Access could not be verified.");
    let payload={};try{payload=JSON.parse(data.response||"{}");}catch{}
    if(!payload.ok)throw new Error(payload.message||"Access could not be verified.");
    currentUser={studentId:payload.studentId||studentId,role:payload.role||"student",token:payload.sessionToken||null};
    isAdmin=currentUser.role==="admin";
    sessionStorage.setItem("rtmSession",JSON.stringify({studentId:currentUser.studentId,role:currentUser.role,startedAt:new Date().toISOString(),token:currentUser.token}));
    if(isAdmin){show(adminView);say("Administrator access verified.","adminMessage");}
    else{show(readerView);await logEvent("session_start");}
  }
  $("loginForm").addEventListener("submit",async e=>{e.preventDefault();say("Checking access…","loginMessage");try{await login($("studentId").value.trim(),$("accessCode").value,$("assessmentToggle").dataset.temporary==="1");}catch(err){say(err.message,"loginMessage");}});
  $("assessmentToggle").onclick=()=>{const active=$("assessmentToggle").dataset.temporary==="1";$("assessmentToggle").dataset.temporary=active?"0":"1";$("accessCode").placeholder=active?"Enter your code":"Enter your one-time assessment code";$("assessmentToggle").textContent=active?"Use a temporary assessment code":"Use your permanent student code";};
  async function logEvent(eventType){
    if(!ready()||!currentUser)return;
    try{await fetch(`${cfg.endpoint}/functions/${cfg.functionId}/executions`,{method:"POST",headers:{"Content-Type":"application/json","X-Appwrite-Project":cfg.projectId},body:JSON.stringify({body:JSON.stringify({action:"event",studentId:currentUser.studentId,eventType,at:new Date().toISOString()}),async:true})});}catch{}
  }
  document.addEventListener("visibilitychange",()=>{if(currentUser&&!isAdmin)logEvent(document.hidden?"page_hidden":"page_visible");});
  $("logoutBtn").onclick=async()=>{if(currentUser)await logEvent("session_end");closeCamera();if("speechSynthesis"in window)speechSynthesis.cancel();currentUser=null;sessionStorage.removeItem("rtmSession");show(loginView);say("You have signed out.","loginMessage");};
  async function adminAction(action,extra={}){
    if(!ready())throw new Error("Connect Appwrite first.");
    const res=await fetch(`${cfg.endpoint}/functions/${cfg.functionId}/executions`,{method:"POST",headers:{"Content-Type":"application/json","X-Appwrite-Project":cfg.projectId},body:JSON.stringify({body:JSON.stringify({action,...extra,adminSession:currentUser?.token}),async:false})});
    const d=await res.json();if(!res.ok||d.status==="failed")throw new Error(d.response||"Admin request failed.");
    let result={};try{result=JSON.parse(d.response||"{}");}catch{}if(!result.ok)throw new Error(result.message||"Admin request failed.");return result;
  }
  $("loadAdminData").onclick=async()=>{try{const r=await adminAction("admin_list");$("adminResults").innerHTML="<pre></pre>";$("adminResults").querySelector("pre").textContent=JSON.stringify(r.records||[],null,2);say("Records loaded.","adminMessage");}catch(e){say(e.message,"adminMessage");}};
  $("createStudent").onclick=async()=>{const studentId=prompt("New student ID (do not use a sensitive identifier):");if(!studentId)return;const displayName=prompt("Student display name:")||studentId;try{const r=await adminAction("admin_create_student",{studentId,displayName});say(`Student created. Give them this one-time setup code: ${r.initialCode||"Check admin records"}`,"adminMessage");}catch(e){say(e.message,"adminMessage");}};
  $("issueTemp").onclick=async()=>{const studentId=prompt("Student ID for this assessment:");if(!studentId)return;const minutes=Number(prompt("Code expiry in minutes:", "120")||120);try{const r=await adminAction("admin_issue_temp",{studentId,minutes});say(`Temporary code: ${r.code||"not returned"}. It can be used once and expires after ${minutes} minutes.`,"adminMessage");}catch(e){say(e.message,"adminMessage");}};
  // Do not restore an authenticated session from browser storage: sign in again after reload.
  show(loginView);
  if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
})();
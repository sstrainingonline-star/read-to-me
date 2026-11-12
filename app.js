(() => {
  const $ = id => document.getElementById(id);
  const video = $("camera"), canvas = $("captureCanvas"), ctx = canvas.getContext("2d");
  const transcript = $("transcript"), progressBar = $("progressBar");
  let stream = null, worker = null, scanning = false, busy = false, scanTimer = null;
  let previousCandidate = "", stableCount = 0, lastAutoRead = "", currentText = "";
  let lastSpokenText = "", toastTimer = null;

  const sayToast = message => {
    const toast = $("toast"); toast.textContent = message; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  };
  const setStatus = (label, state="") => { $("ocrStatus").textContent = label; $("ocrStatus").className = "status-pill " + state; };
  const showText = text => {
    currentText = (text || "").trim();
    transcript.textContent = currentText || "No clear words found yet. Try moving closer or improving the lighting.";
    transcript.style.fontSize = $("textSize").value + "px";
    $("readText").disabled = !currentText;
    $("replayRead").disabled = !lastSpokenText;
  };
  const setProgress = value => progressBar.style.width = Math.max(0, Math.min(100, value || 0)) + "%";

  async function getWorker() {
    if (worker) return worker;
    if (!window.Tesseract) throw new Error("The free text reader could not load. Check your internet connection and reload.");
    setStatus("LOADING READER", "working");
    worker = await Tesseract.createWorker("eng", 1, {
      logger: m => { if (m.status === "recognizing text") setProgress(m.progress * 100); }
    });
    return worker;
  }

  function captureFrame() {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) throw new Error("Camera is not ready yet.");
    const scale = Math.min(1, 1500 / w);
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  async function recognise(source, live=false) {
    if (busy) return "";
    busy = true; setStatus("READING", "working"); setProgress(12);
    try {
      const w = await getWorker();
      const result = await w.recognize(source);
      const text = (result.data.text || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      setProgress(100);
      if (text) {
        showText(text); setStatus("WORDS FOUND", "done");
        if (live) {
          const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
          if (normalized === previousCandidate) stableCount++; else { previousCandidate = normalized; stableCount = 1; }
          if ($("autoRead").checked && stableCount >= 2 && normalized !== lastAutoRead) {
            lastAutoRead = normalized; speak(text);
          }
        }
      } else if (!live) {
        showText(""); setStatus("NO TEXT FOUND");
        sayToast("I couldn't find clear text. Try a closer, sharper photo.");
      }
      return text;
    } catch (err) {
      setStatus("READER ERROR"); sayToast(err.message || "Something went wrong while reading.");
      return "";
    } finally {
      busy = false;
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      sayToast("Camera access needs a secure connection. Open this site on its GitHub Pages HTTPS address."); return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      video.srcObject = stream; await video.play();
      video.style.display = "block"; $("cameraPlaceholder").style.display = "none";
      $("cameraFrame").classList.add("scanning");
      $("cameraStatus").textContent = "Live camera active";
      $("startCamera").disabled = true; $("readFrame").disabled = false; $("stopCamera").disabled = false;
      $("liveIndicator").classList.add("active"); $("liveIndicator").querySelector("span").textContent = "LIVE";
      scanning = true; previousCandidate = ""; stableCount = 0; lastAutoRead = "";
      sayToast("Camera started. Hold steady over the words.");
      scanLoop();
    } catch (err) {
      sayToast(err.name === "NotAllowedError" ? "Camera permission was blocked. Allow camera access in your browser settings." : "Couldn't start the camera. Check camera access and try again.");
    }
  }

  async function scanLoop() {
    if (!scanning) return;
    if (!busy && video.readyState >= 2) {
      try { await recognise(captureFrame(), true); } catch (e) { /* next scan can retry */ }
    }
    if (scanning) scanTimer = setTimeout(scanLoop, 1700);
  }

  function stopCamera() {
    scanning = false; clearTimeout(scanTimer);
    if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
    video.srcObject = null; video.style.display = "none";
    $("cameraPlaceholder").style.display = "flex"; $("cameraFrame").classList.remove("scanning");
    $("cameraStatus").textContent = "Camera stopped";
    $("startCamera").disabled = false; $("readFrame").disabled = true; $("stopCamera").disabled = true;
    $("liveIndicator").classList.remove("active"); $("liveIndicator").querySelector("span").textContent = "READY";
    setStatus("WAITING");
  }

  function selectedVoice() {
    const index = $("voice").value;
    return index === "" ? null : (speechSynthesis.getVoices()[Number(index)] || null);
  }
  function speak(text) {
    if (!("speechSynthesis" in window)) { sayToast("Speech playback is not supported in this browser."); return; }
    const clean = (text || "").trim(); if (!clean) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = Number($("speed").value);
    const voice = selectedVoice(); if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "en-GB";
    utterance.onstart = () => { $("speakingStatus").lastElementChild.textContent = "Reading aloud"; $("speakingStatus").querySelector(".sound-bars").classList.add("speaking"); };
    utterance.onend = () => { $("speakingStatus").lastElementChild.textContent = "Finished reading"; $("speakingStatus").querySelector(".sound-bars").classList.remove("speaking"); };
    utterance.onerror = () => { $("speakingStatus").lastElementChild.textContent = "Ready when you are"; $("speakingStatus").querySelector(".sound-bars").classList.remove("speaking"); };
    lastSpokenText = clean; $("pauseRead").disabled = false; $("stopRead").disabled = false; $("replayRead").disabled = false;
    speechSynthesis.speak(utterance);
  }
  function stopSpeech() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    $("speakingStatus").lastElementChild.textContent = "Playback stopped";
    $("speakingStatus").querySelector(".sound-bars").classList.remove("speaking");
    $("pauseRead").disabled = true; $("stopRead").disabled = true;
  }

  function populateVoices() {
    if (!("speechSynthesis" in window)) return;
    const select = $("voice"), old = select.value;
    const voices = speechSynthesis.getVoices();
    select.innerHTML = '<option value="">Device default voice</option>';
    voices.forEach((v, i) => {
      const option = document.createElement("option"); option.value = i;
      option.textContent = `${v.name} (${v.lang})${v.default ? " — default" : ""}`;
      select.appendChild(option);
    });
    if (old && Number(old) < voices.length) select.value = old;
    else {
      const preferred = voices.findIndex(v => /^en-GB/i.test(v.lang));
      if (preferred >= 0) select.value = preferred;
    }
  }

  $("startCamera").addEventListener("click", startCamera);
  $("stopCamera").addEventListener("click", stopCamera);
  $("readFrame").addEventListener("click", async () => {
    stopSpeech(); previousCandidate = ""; stableCount = 0;
    await recognise(captureFrame(), false);
    if (currentText) speak(currentText);
  });
  $("imageUpload").addEventListener("change", async e => {
    const file = e.target.files?.[0]; if (!file) return;
    stopSpeech(); stopCamera(); setStatus("OPENING PHOTO", "working");
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => { await recognise(img, false); URL.revokeObjectURL(url); e.target.value = ""; };
      img.onerror = () => { URL.revokeObjectURL(url); sayToast("That image couldn't be opened."); };
      img.src = url;
    } catch { sayToast("Couldn't open that photo."); }
  });
  $("readText").addEventListener("click", () => speak(currentText));
  $("pauseRead").addEventListener("click", () => {
    if (speechSynthesis.paused) { speechSynthesis.resume(); $("pauseRead").textContent = "Ⅱ"; }
    else { speechSynthesis.pause(); $("pauseRead").textContent = "▶"; $("speakingStatus").lastElementChild.textContent = "Paused"; }
  });
  $("replayRead").addEventListener("click", () => speak(lastSpokenText || currentText));
  $("stopRead").addEventListener("click", stopSpeech);
  $("speed").addEventListener("input", e => $("speedValue").textContent = Number(e.target.value).toFixed(1) + "×");
  $("textSize").addEventListener("input", e => { $("textSizeValue").textContent = Number(e.target.value) >= 28 ? "Extra large" : Number(e.target.value) >= 24 ? "Large" : "Standard"; transcript.style.fontSize = e.target.value + "px"; });
  $("helpButton").addEventListener("click", () => $("helpDialog").showModal());
  $("closeHelp").addEventListener("click", () => $("helpDialog").close());
  $("gotIt").addEventListener("click", () => $("helpDialog").close());
  if ("speechSynthesis" in window) { populateVoices(); speechSynthesis.onvoiceschanged = populateVoices; }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
  }
  window.addEventListener("pagehide", () => { stopCamera(); stopSpeech(); });
})();
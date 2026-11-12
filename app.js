(() => {
  const $ = id => document.getElementById(id);
  const video = $("camera"), canvas = $("captureCanvas"), ctx = canvas.getContext("2d");
  const transcript = $("transcript"), progressBar = $("progressBar");
  let stream = null, worker = null, scanning = false, busy = false, scanTimer = null;
  let previousCandidate = "", stableCount = 0, lastAutoRead = "", currentText = "";
  let lastSpokenText = "", toastTimer = null, ignoredText = "";

  const sayToast = message => {
    const toast = $("toast"); toast.textContent = message; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3400);
  };
  const setStatus = (label, state="") => { $("ocrStatus").textContent = label; $("ocrStatus").className = "status-pill " + state; };
  const setProgress = value => progressBar.style.width = Math.max(0, Math.min(100, value || 0)) + "%";
  const normaliseForCompare = text => (text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

  function repairSpacedLetters(line) {
    const tokens = line.trim().split(/\s+/);
    const out = []; let singles = [];
    const flush = () => {
      if (singles.length >= 3) {
        const joined = singles.join("");
        out.push(joined.toLowerCase() === "iam" ? "I am" : joined);
      } else out.push(...singles);
      singles = [];
    };
    for (const token of tokens) {
      const bare = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (/^[A-Za-z]$/.test(bare) && !/[.!?;:]$/.test(token)) singles.push(bare);
      else { flush(); out.push(token); }
    }
    flush();
    return out.join(" ").replace(/\s+([,.;:!?])/g, "$1");
  }

  function cleanRecognisedText(data) {
    let lines = [];
    if (Array.isArray(data.lines) && data.lines.length) {
      lines = data.lines.map(line => (line.text || "").trim()).filter(Boolean);
    } else if (Array.isArray(data.words) && data.words.length) {
      lines = [data.words.map(word => word.text).join(" ")];
    } else if (data.text) lines = data.text.split(/\r?\n/);
    return lines.map(repairSpacedLetters).join("\n")
      .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  function showText(text) {
    currentText = (text || "").trim();
    transcript.textContent = currentText || "No clear words found yet. Try a closer, sharper photo.";
    transcript.style.fontSize = $("textSize").value + "px";
    $("readText").disabled = !currentText;
    $("clearText").disabled = !currentText && !lastSpokenText;
    $("replayRead").disabled = !lastSpokenText;
  }

  async function getWorker() {
    if (worker) return worker;
    if (!window.Tesseract) throw new Error("The free text reader could not load. Check your internet connection and reload.");
    setStatus("LOADING READER", "working");
    worker = await Tesseract.createWorker("eng", 1, {
      logger: m => { if (m.status === "recognizing text") setProgress(m.progress * 100); }
    });
    // A single text block is best for ordinary printed test sheets and preserves word spacing.
    await worker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1", user_defined_dpi: "300" });
    return worker;
  }

  function prepareImage(source) {
    const sw = source.videoWidth || source.naturalWidth || source.width;
    const sh = source.videoHeight || source.naturalHeight || source.height;
    if (!sw || !sh) throw new Error("The photo is not ready. Please choose the picture again.");
    // Upscale small phone images for better letter and word recognition.
    const scale = Math.min(2.5, Math.max(1, 2200 / sw));
    const work = document.createElement("canvas");
    work.width = Math.round(sw * scale); work.height = Math.round(sh * scale);
    const c = work.getContext("2d", { willReadFrequently: true });
    c.fillStyle = "white"; c.fillRect(0, 0, work.width, work.height);
    c.drawImage(source, 0, 0, work.width, work.height);
    const image = c.getImageData(0, 0, work.width, work.height);
    const px = image.data; let total = 0;
    for (let i=0; i<px.length; i+=4) total += (px[i]*.299 + px[i+1]*.587 + px[i+2]*.114);
    const average = total / (px.length / 4);
    const invert = average < 115;
    const threshold = Math.max(145, Math.min(205, average * .78));
    for (let i=0; i<px.length; i+=4) {
      let gray = px[i]*.299 + px[i+1]*.587 + px[i+2]*.114;
      // Increase contrast while retaining anti-aliased edges instead of harshly thresholding every pixel.
      gray = Math.max(0, Math.min(255, (gray - 128) * 1.45 + 128));
      if (invert) gray = 255 - gray;
      px[i] = px[i+1] = px[i+2] = gray;
    }
    c.putImageData(image, 0, 0);
    return work;
  }

  async function recognise(source, live=false) {
    // If a live frame is being processed, wait rather than silently dropping a selected photo.
    while (busy) await new Promise(resolve => setTimeout(resolve, 120));
    busy = true; setStatus("READING", "working"); setProgress(5);
    try {
      const prepared = prepareImage(source);
      const w = await getWorker();
      const result = await w.recognize(prepared);
      const text = cleanRecognisedText(result.data || {});
      setProgress(100);
      if (text) {
        const key = normaliseForCompare(text);
        if (live && ignoredText && key === ignoredText) {
          setStatus("READY", "");
          return text;
        }
        if (live && ignoredText && key !== ignoredText) ignoredText = "";
        showText(text); setStatus("WORDS FOUND", "done");
        if (live) {
          if (key === previousCandidate) stableCount++;
          else { previousCandidate = key; stableCount = 1; }
          // Require the same result on consecutive frames before speaking to avoid reading camera blur.
          if ($("autoRead").checked && stableCount >= 2 && key !== lastAutoRead) {
            lastAutoRead = key;
            speak(text);
          }
        }
        return text;
      }
      if (!live) {
        showText(""); setStatus("NO TEXT FOUND");
        sayToast("I couldn't find clear text. Try better lighting and hold the page flat.");
      }
      return "";
    } catch (err) {
      setStatus("READER ERROR"); sayToast(err.message || "Something went wrong while reading.");
      return "";
    } finally {
      busy = false;
    }
  }

  function captureFrame() {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) throw new Error("Camera is not ready yet.");
    const scale = Math.min(1, 1800 / w);
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      sayToast("Camera access needs a secure connection. Open this site on its GitHub Pages HTTPS address."); return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      video.srcObject = stream; await video.play();
      video.style.display = "block"; $("cameraPlaceholder").style.display = "none";
      $("cameraFrame").classList.add("scanning"); $("cameraStatus").textContent = "Live camera active";
      $("startCamera").disabled = true; $("readFrame").disabled = false; $("stopCamera").disabled = false;
      $("liveIndicator").classList.add("active"); $("liveIndicator").querySelector("span").textContent = "LIVE";
      scanning = true; previousCandidate = ""; stableCount = 0; lastAutoRead = ""; ignoredText = "";
      sayToast("Live reader started. Keep the page steady — it will read recognised text aloud.");
      scanLoop();
    } catch (err) {
      sayToast(err.name === "NotAllowedError" ? "Camera permission was blocked. Allow camera access in your browser settings." : "Couldn't start the camera. Check camera access and try again.");
    }
  }

  async function scanLoop() {
    if (!scanning) return;
    if (!busy && video.readyState >= 2) {
      try { await recognise(captureFrame(), true); } catch (e) { /* retry on next frame */ }
    }
    if (scanning) scanTimer = setTimeout(scanLoop, 1500);
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
    utterance.onend = () => { $("speakingStatus").lastElementChild.textContent = "Finished reading"; $("speakingStatus").querySelector(".sound-bars").classList.remove("speaking"); $("pauseRead").disabled = true; $("stopRead").disabled = true; };
    utterance.onerror = () => { $("speakingStatus").lastElementChild.textContent = "Ready when you are"; $("speakingStatus").querySelector(".sound-bars").classList.remove("speaking"); };
    lastSpokenText = clean; $("pauseRead").disabled = false; $("stopRead").disabled = false; $("replayRead").disabled = false; $("clearText").disabled = false;
    speechSynthesis.speak(utterance);
  }
  function stopSpeech() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    $("speakingStatus").lastElementChild.textContent = "Playback stopped";
    $("speakingStatus").querySelector(".sound-bars").classList.remove("speaking");
    $("pauseRead").disabled = true; $("stopRead").disabled = true; $("pauseRead").textContent = "Ⅱ";
  }
  function clearReading() {
    stopSpeech();
    ignoredText = lastAutoRead || previousCandidate || normaliseForCompare(currentText);
    currentText = ""; lastSpokenText = "";
    transcript.textContent = "Cleared. Point the camera at the next question or choose another photo.";
    $("readText").disabled = true; $("replayRead").disabled = true; $("clearText").disabled = true;
    previousCandidate = ignoredText; stableCount = 0;
    $("speakingStatus").lastElementChild.textContent = "Ready for the next question";
    setStatus(scanning ? "LIVE — READY" : "WAITING", scanning ? "working" : "");
  }

  function loadPhotoFile(file) {
    // createImageBitmap is fast where supported; FileReader/Image is a fallback for iOS browsers.
    if (window.createImageBitmap) {
      return createImageBitmap(file).catch(() => loadPhotoWithImage(file));
    }
    return loadPhotoWithImage(file);
  }
  function loadPhotoWithImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Photo file could not be read."));
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Photo format is not supported by this browser."));
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  async function handlePhoto(file) {
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) { sayToast("Please choose an image file, such as JPG or PNG."); return; }
    stopSpeech(); stopCamera(); clearReading(); setStatus("OPENING PHOTO", "working");
    const buttonLabel = document.querySelector(".upload-label");
    buttonLabel.textContent = "Opening photo…";
    try {
      const bitmap = await loadPhotoFile(file);
      const recognised = await recognise(bitmap, false);
      if (recognised) { speak(recognised); sayToast("Photo read successfully."); }
      bitmap.close?.();
    } catch (err) {
      sayToast(err.message || "Couldn't open that photo. Try a JPG or PNG image."); setStatus("PHOTO ERROR");
    } finally {
      buttonLabel.textContent = "↑ Choose photo / take photo";
      $("imageUpload").value = "";
    }
  }

  function populateVoices() {
    if (!("speechSynthesis" in window)) return;
    const select = $("voice"), old = select.value, voices = speechSynthesis.getVoices();
    select.innerHTML = '<option value="">Device default voice</option>';
    voices.forEach((v, i) => {
      const option = document.createElement("option"); option.value = i;
      option.textContent = `${v.name} (${v.lang})${v.default ? " — default" : ""}`; select.appendChild(option);
    });
    if (old && Number(old) < voices.length) select.value = old;
    else { const preferred = voices.findIndex(v => /^en-GB/i.test(v.lang)); if (preferred >= 0) select.value = preferred; }
  }

  $("startCamera").addEventListener("click", startCamera);
  $("stopCamera").addEventListener("click", stopCamera);
  $("readFrame").addEventListener("click", async () => {
    stopSpeech(); previousCandidate = ""; stableCount = 0; lastAutoRead = "";
    const text = await recognise(captureFrame(), false); if (text) speak(text);
  });
  $("imageUpload").addEventListener("change", e => handlePhoto(e.target.files?.[0]));
  $("readText").addEventListener("click", () => speak(currentText));
  $("clearText").addEventListener("click", clearReading);
  $("pauseRead").addEventListener("click", () => {
    if (speechSynthesis.paused) { speechSynthesis.resume(); $("pauseRead").textContent = "Ⅱ"; $("speakingStatus").lastElementChild.textContent = "Reading aloud"; }
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
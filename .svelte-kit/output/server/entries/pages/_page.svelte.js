import { a8 as ssr_context, a9 as ensure_array_like, aa as attr_class, s as store_get, ab as attr, e as escape_html, u as unsubscribe_stores, ac as fallback, ad as bind_props, ae as attr_style, af as stringify, ag as head } from "../../chunks/index2.js";
import { S as SCALES, s as sessionMode, a as selectedKey, b as selectedScale, d as selectedOctave, r as runDurationSecs, t as tempoBpm, n as noiseGateThreshold, K as KEY_NAMES, m as musicContext, e as appPhase, f as midiToFreq } from "../../chunks/musicStore.js";
import "clsx";
import { w as writable, g as get } from "../../chunks/index.js";
import { openDB } from "idb";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
const DB_NAME = "vocal-coach";
const DB_VERSION = 2;
let _db = null;
async function getDB() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const store = db.createObjectStore("sessions", { keyPath: "id" });
        store.createIndex("by_startedAt", "startedAt");
      }
      if (oldVersion < 2) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
    }
  });
  return _db;
}
class IdbHistory {
  async save(session) {
    const db = await getDB();
    await db.put("sessions", session);
  }
  async getAll() {
    const db = await getDB();
    const all = await db.getAllFromIndex("sessions", "by_startedAt");
    return all.reverse();
  }
  async delete(id) {
    const db = await getDB();
    await db.delete("sessions", id);
  }
}
class DroneEngine {
  osc = null;
  gainNode = null;
  filter = null;
  _context = null;
  _volume = 0.25;
  play(context, frequency, volume = 0.25) {
    this.stop(context);
    this._context = context;
    this._volume = volume;
    this.filter = context.createBiquadFilter();
    this.filter.type = "highpass";
    this.filter.frequency.value = 80;
    this.filter.connect(context.destination);
    this.gainNode = context.createGain();
    this.gainNode.gain.setValueAtTime(0, context.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.04);
    this.gainNode.connect(this.filter);
    this.osc = context.createOscillator();
    this.osc.type = "sawtooth";
    this.osc.frequency.value = frequency;
    this.osc.connect(this.gainNode);
    this.osc.start();
  }
  setFrequency(frequency) {
    if (!this.osc || !this.gainNode || !this._context) return;
    const now = this._context.currentTime;
    this.osc.frequency.setValueAtTime(frequency, now);
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.linearRampToValueAtTime(this._volume, now + 0.04);
  }
  setVolume(volume) {
    this._volume = volume;
    if (!this.gainNode || !this._context) return;
    const now = this._context.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(volume, now + 0.02);
  }
  stop(context) {
    const ctx = context ?? this._context;
    if (this.gainNode && ctx) {
      const now = ctx.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(0, now + 0.08);
      const osc = this.osc;
      const gn = this.gainNode;
      const filt = this.filter;
      setTimeout(() => {
        try {
          osc?.stop();
        } catch {
        }
        gn?.disconnect();
        filt?.disconnect();
      }, 120);
    } else {
      try {
        this.osc?.stop();
      } catch {
      }
      this.gainNode?.disconnect();
      this.filter?.disconnect();
    }
    this.osc = null;
    this.gainNode = null;
    this.filter = null;
    this._context = null;
  }
  get isPlaying() {
    return this.osc !== null;
  }
}
function IdleView($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const scaleOptions = Object.entries(SCALES).map(([value, def]) => ({ value, label: def.name }));
    const durationOptions = [15, 30, 60, 120];
    $$renderer2.push(`<div class="idle-view svelte-q83fm6"><div class="card svelte-q83fm6"><h1 class="app-title svelte-q83fm6">Vocal Pitch</h1> <section class="section svelte-q83fm6"><span class="section-label svelte-q83fm6">Mode</span> <div class="mode-group svelte-q83fm6" role="group" aria-label="Session mode"><!--[-->`);
    const each_array = ensure_array_like([
      ["free", "Free"],
      ["scale", "Scale"],
      ["interval", "Interval"]
    ]);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let [val, label] = each_array[$$index];
      $$renderer2.push(`<button${attr_class("mode-btn svelte-q83fm6", void 0, {
        "active": store_get($$store_subs ??= {}, "$sessionMode", sessionMode) === val
      })}${attr("aria-pressed", store_get($$store_subs ??= {}, "$sessionMode", sessionMode) === val)}>${escape_html(label)}</button>`);
    }
    $$renderer2.push(`<!--]--></div> <p class="mode-desc svelte-q83fm6">`);
    if (store_get($$store_subs ??= {}, "$sessionMode", sessionMode) === "free") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`Sing freely — see how close you are to the key and scale you choose.`);
    } else if (store_get($$store_subs ??= {}, "$sessionMode", sessionMode) === "scale") {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`Sing ascending and descending through the scale with a guide tone.`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Practice intervals: root → 2nd → root → 3rd → root → … with a guide tone.`);
    }
    $$renderer2.push(`<!--]--></p></section> <section class="section row svelte-q83fm6"><div class="field svelte-q83fm6"><label class="field-label svelte-q83fm6" for="key-select">Key</label> `);
    $$renderer2.select(
      {
        id: "key-select",
        value: store_get($$store_subs ??= {}, "$selectedKey", selectedKey)
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(KEY_NAMES);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let key = each_array_1[$$index_1];
          $$renderer3.option({ value: key }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(key)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(`</div> <div class="field svelte-q83fm6"><label class="field-label svelte-q83fm6" for="scale-select">Scale</label> `);
    $$renderer2.select(
      {
        id: "scale-select",
        value: store_get($$store_subs ??= {}, "$selectedScale", selectedScale)
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_2 = ensure_array_like(scaleOptions);
        for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
          let opt = each_array_2[$$index_2];
          $$renderer3.option({ value: opt.value }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(opt.label)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(`</div> <div class="field svelte-q83fm6"><div class="field-label-row svelte-q83fm6"><label class="field-label svelte-q83fm6" for="octave-select">Register</label> <button class="info-btn svelte-q83fm6" aria-label="What is register?">ⓘ</button></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    $$renderer2.select(
      {
        id: "octave-select",
        value: store_get($$store_subs ??= {}, "$selectedOctave", selectedOctave)
      },
      ($$renderer3) => {
        $$renderer3.option({ value: 2 }, ($$renderer4) => {
          $$renderer4.push(`Low (oct 2)`);
        });
        $$renderer3.option({ value: 3 }, ($$renderer4) => {
          $$renderer4.push(`Mid-low (oct 3)`);
        });
        $$renderer3.option({ value: 4 }, ($$renderer4) => {
          $$renderer4.push(`Mid (oct 4)`);
        });
        $$renderer3.option({ value: 5 }, ($$renderer4) => {
          $$renderer4.push(`High (oct 5)`);
        });
      }
    );
    $$renderer2.push(`</div></section> `);
    if (store_get($$store_subs ??= {}, "$sessionMode", sessionMode) !== "free") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="section svelte-q83fm6"><span class="section-label svelte-q83fm6">Duration</span> <div class="duration-group svelte-q83fm6" role="group" aria-label="Run duration"><!--[-->`);
      const each_array_3 = ensure_array_like(durationOptions);
      for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
        let secs = each_array_3[$$index_3];
        $$renderer2.push(`<button${attr_class("dur-btn svelte-q83fm6", void 0, {
          "active": store_get($$store_subs ??= {}, "$runDurationSecs", runDurationSecs) === secs
        })}${attr("aria-pressed", store_get($$store_subs ??= {}, "$runDurationSecs", runDurationSecs) === secs)}>${escape_html(secs)}s</button>`);
      }
      $$renderer2.push(`<!--]--></div></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (store_get($$store_subs ??= {}, "$sessionMode", sessionMode) !== "free") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="section svelte-q83fm6"><span class="section-label svelte-q83fm6">Tempo</span> <div class="tempo-row svelte-q83fm6"><input id="tempo-slider" type="range" min="30" max="120" step="5"${attr("value", store_get($$store_subs ??= {}, "$tempoBpm", tempoBpm))} class="tempo-slider svelte-q83fm6" aria-label="Tempo in BPM"/> <span class="tempo-value svelte-q83fm6">${escape_html(store_get($$store_subs ??= {}, "$tempoBpm", tempoBpm))} BPM</span></div></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <button class="noise-gate-btn svelte-q83fm6"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"></path><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg> Noise gate <span class="gate-value svelte-q83fm6">${escape_html((store_get($$store_subs ??= {}, "$noiseGateThreshold", noiseGateThreshold) * 1e3).toFixed(1))}</span></button> <button class="ref-btn svelte-q83fm6" title="Play root note for reference"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="6" x2="12" y2="8"></line><line x1="12" y1="16" x2="12" y2="18"></line><path d="M12 8c-1.5 0-3 .8-3 2.5s1.5 2.5 3 2.5 3 .8 3 2.5-1.5 2.5-3 2.5"></path></svg> Play root note</button> <button class="start-btn svelte-q83fm6"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line><line x1="8" y1="22" x2="16" y2="22"></line></svg> Start Listening</button> <button class="history-link svelte-q83fm6">View history</button></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
const TRACE_DURATION_MS = 5e3;
const tracePoints = writable([]);
let _accumulator = [];
function startAccumulator() {
  _accumulator = [];
}
function getAccumulator() {
  return [..._accumulator];
}
function pushTracePoint(point) {
  _accumulator.push(point);
  tracePoints.update((pts) => {
    const now = performance.now();
    const trimmed = pts.filter((p) => now - p.timestamp < TRACE_DURATION_MS);
    return [...trimmed, point];
  });
}
function clearTrace() {
  tracePoints.set([]);
}
const isListening = writable(false);
const rawPitch = writable(null);
const pitchConfidence = writable(0);
const smoothedPitch = writable(null);
const audioError = writable(null);
function tuningBackground(absCents) {
  if (absCents === null) return "#0f1117";
  if (absCents < 15) return "#0d3b38";
  if (absCents < 30) return "#3b2a0a";
  return "#1e293b";
}
function tuningAccent(absCents) {
  if (absCents === null) return "#475569";
  if (absCents < 15) return "#2dd4bf";
  if (absCents < 30) return "#fbbf24";
  return "#94a3b8";
}
const pitchProcessorUrl = "/_app/immutable/workers/pitch-processor.worklet-BR2_vmqK.js";
class AudioEngine {
  audioCtx = null;
  workletNode = null;
  sourceNode = null;
  stream = null;
  recorder = null;
  recordingChunks = [];
  get audioContext() {
    return this.audioCtx;
  }
  async start(onPitch, noiseGateRms) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1
      }
    });
    this.audioCtx = new AudioContext({ latencyHint: "interactive" });
    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }
    await this.audioCtx.audioWorklet.addModule(pitchProcessorUrl);
    this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.audioCtx, "pitch-processor");
    this.workletNode.port.onmessage = (e) => {
      onPitch(e.data);
    };
    if (noiseGateRms !== void 0) {
      this.workletNode.port.postMessage({ type: "config", noiseGateRms });
    }
    this.sourceNode.connect(this.workletNode);
    this.recordingChunks = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
    try {
      this.recorder = new MediaRecorder(this.stream, { mimeType });
      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordingChunks.push(e.data);
      };
      this.recorder.start(100);
    } catch {
      this.recorder = null;
    }
  }
  /** Stop the engine and return the recorded audio blob (null if unavailable). */
  async stop() {
    const audioBlob = await new Promise((resolve) => {
      if (!this.recorder || this.recorder.state === "inactive") {
        resolve(null);
        return;
      }
      this.recorder.onstop = () => {
        const blob = this.recordingChunks.length > 0 ? new Blob(this.recordingChunks, { type: this.recorder.mimeType }) : null;
        resolve(blob);
      };
      this.recorder.stop();
    });
    this.recorder = null;
    this.recordingChunks = [];
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.workletNode?.port.close();
    this.workletNode?.disconnect();
    this.workletNode = null;
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    if (this.audioCtx) {
      await this.audioCtx.close();
      this.audioCtx = null;
    }
    return audioBlob;
  }
}
class VibratoSmoother {
  ALPHA_FAST = 0.4;
  // ~2 frame time constant at 60Hz
  ALPHA_SLOW = 0.05;
  // ~330ms time constant at 60Hz
  SILENCE_GATE_MS = 100;
  smoothedRaw = null;
  center = null;
  silenceMs = 0;
  update(rawHz, deltaMs) {
    if (rawHz === null) {
      this.silenceMs += deltaMs;
      if (this.silenceMs > this.SILENCE_GATE_MS) {
        this.smoothedRaw = null;
        this.center = null;
      }
      return { raw: null, center: null };
    }
    this.silenceMs = 0;
    if (this.smoothedRaw === null) {
      this.smoothedRaw = rawHz;
      this.center = rawHz;
    }
    this.smoothedRaw = this.ALPHA_FAST * rawHz + (1 - this.ALPHA_FAST) * this.smoothedRaw;
    this.center = this.ALPHA_SLOW * this.smoothedRaw + (1 - this.ALPHA_SLOW) * this.center;
    return { raw: this.smoothedRaw, center: this.center };
  }
  reset() {
    this.smoothedRaw = null;
    this.center = null;
    this.silenceMs = 0;
  }
}
const completedSession = writable(null);
function scoreSession(points) {
  if (points.length === 0) {
    return { percentOnScale: 0, avgCentsDeviation: 0, grade: "D" };
  }
  const stable = points.filter((pt, i) => {
    if (i === 0) return true;
    return Math.abs(pt.rawMidi - points[i - 1].rawMidi) <= 3;
  });
  const scored = stable.length > 0 ? stable : points;
  const onScale = scored.filter((p) => p.isOnScale).length;
  const percentOnScale = onScale / scored.length * 100;
  const avgCentsDeviation = scored.reduce((sum, p) => sum + Math.abs(p.centsDeviation), 0) / scored.length;
  let grade;
  if (percentOnScale >= 90) grade = "S";
  else if (percentOnScale >= 75) grade = "A";
  else if (percentOnScale >= 60) grade = "B";
  else if (percentOnScale >= 45) grade = "C";
  else grade = "D";
  return { percentOnScale, avgCentsDeviation, grade };
}
const historyStore = new IdbHistory();
function generateScaleSequence(ctx, octave) {
  const tones = ctx.getScaleTones();
  const ascending = tones.filter(
    (t) => t.octave === octave || t.octave === octave + 1 && t.degree === 0
  );
  if (ascending.length === 0) return [];
  ascending.sort((a, b) => a.midi - b.midi);
  const descending = [...ascending].reverse().slice(1);
  return [...ascending, ...descending].map((t) => t.midi);
}
function generateIntervalSequence(ctx, octave) {
  const tones = ctx.getScaleTones();
  const root = tones.find((t) => t.degree === 0 && t.octave === octave);
  if (!root) return [];
  const octaveTones = tones.filter((t) => t.octave === octave);
  octaveTones.sort((a, b) => a.degree - b.degree);
  const sequence = [];
  const intervals = octaveTones.filter((t) => t.degree !== 0);
  for (const interval of intervals) {
    sequence.push(root.midi);
    sequence.push(interval.midi);
  }
  sequence.push(root.midi);
  return sequence;
}
function CaptureControls($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const engine = new AudioEngine();
    const drone = new DroneEngine();
    const smoother = new VibratoSmoother();
    let timeLeft = fallback($$props["timeLeft"], 0);
    let lastTimestamp = 0;
    let timerInterval = null;
    let metronomeInterval = null;
    let targetSequence = [];
    let currentTargetIndex = 0;
    let currentTargetMidi = fallback($$props["currentTargetMidi"], null);
    function buildTargetSequence() {
      const ctx = get(musicContext);
      const octave = get(selectedOctave);
      const mode = get(sessionMode);
      if (mode === "scale") return generateScaleSequence(ctx, octave);
      if (mode === "interval") return generateIntervalSequence(ctx, octave);
      return [];
    }
    function updateGuideTone() {
      if (targetSequence.length === 0) {
        currentTargetMidi = null;
        return;
      }
      const midi = targetSequence[currentTargetIndex % targetSequence.length];
      currentTargetMidi = midi;
      const freq = midiToFreq(midi);
      const ctx = engine.audioContext;
      if (ctx) {
        if (drone.isPlaying) drone.setFrequency(freq);
        else drone.play(ctx, freq, 0.05);
      }
    }
    function startGuide() {
      targetSequence = buildTargetSequence();
      currentTargetIndex = 0;
      updateGuideTone();
      const beatMs = 60 / get(tempoBpm) * 1e3;
      metronomeInterval = setInterval(
        () => {
          currentTargetIndex++;
          updateGuideTone();
        },
        beatMs
      );
    }
    async function endSession() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      if (metronomeInterval) {
        clearInterval(metronomeInterval);
        metronomeInterval = null;
      }
      drone.stop(engine.audioContext ?? void 0);
      const audioBlob = await engine.stop();
      smoother.reset();
      isListening.set(false);
      rawPitch.set(null);
      smoothedPitch.set(null);
      const points = getAccumulator();
      const score = scoreSession(points);
      const session = {
        id: crypto.randomUUID(),
        startedAt: Date.now(),
        durationMs: points.length > 0 ? points[points.length - 1].timestamp - points[0].timestamp : 0,
        mode: get(sessionMode),
        key: get(selectedKey),
        scale: get(selectedScale),
        tracePoints: points,
        targetSequence: targetSequence.length > 0 ? targetSequence : null,
        tempoBpm: get(sessionMode) !== "free" ? get(tempoBpm) : null,
        score,
        ...audioBlob ? { audioBlob } : {}
      };
      completedSession.set(session);
      try {
        await historyStore.save(session);
      } catch (e) {
        console.warn("Failed to save session to IndexedDB:", e);
      }
      clearTrace();
      appPhase.set("reviewing");
    }
    async function start() {
      audioError.set(null);
      startAccumulator();
      clearTrace();
      lastTimestamp = 0;
      const mode = get(sessionMode);
      const durationSecs = get(runDurationSecs);
      const gateRms = get(noiseGateThreshold);
      try {
        await engine.start(
          (msg) => {
            const now = performance.now();
            const delta = lastTimestamp ? now - lastTimestamp : 16;
            lastTimestamp = now;
            rawPitch.set(msg.frequency);
            pitchConfidence.set(msg.confidence);
            const { raw, center } = smoother.update(msg.frequency, delta);
            smoothedPitch.set(center);
            if (raw !== null && center !== null) {
              const ctx = get(musicContext);
              const analysis = ctx.analyse(raw);
              const centerAnalysis = ctx.analyse(center);
              pushTracePoint({
                timestamp: now,
                rawMidi: analysis.midiValue,
                smoothedMidi: centerAnalysis.midiValue,
                isOnScale: analysis.isOnScale,
                centsDeviation: analysis.centsDeviation,
                degreeLabel: analysis.nearestTone.degreeLabel
              });
            }
          },
          gateRms
        );
        isListening.set(true);
        if (mode !== "free") {
          startGuide();
        }
        if (mode !== "free") {
          timeLeft = durationSecs;
          timerInterval = setInterval(
            () => {
              timeLeft--;
              if (timeLeft <= 0) {
                endSession();
              }
            },
            1e3
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        audioError.set(msg.includes("Permission") || msg.includes("NotAllowed") ? "Microphone access denied. Please allow microphone access and try again." : "Could not start microphone. " + msg);
      }
    }
    async function stop() {
      await endSession();
    }
    onDestroy(() => {
      if (timerInterval) clearInterval(timerInterval);
      if (metronomeInterval) clearInterval(metronomeInterval);
      engine.stop().catch(() => {
      });
      drone.stop();
    });
    bind_props($$props, { timeLeft, currentTargetMidi, start, stop });
  });
}
function CaptureView($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let bgColour, accentColour, centsSign;
    let timeLeft = 0;
    let currentTargetMidi = null;
    let countdown = 3;
    let degreeLabel = null;
    let centsDeviation = null;
    let absCents = null;
    tracePoints.subscribe((pts) => {
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        degreeLabel = last.degreeLabel;
        centsDeviation = last.centsDeviation;
        absCents = Math.abs(last.centsDeviation);
      } else {
        degreeLabel = null;
        centsDeviation = null;
        absCents = null;
      }
    });
    function formatCountdown(secs) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
    }
    bgColour = tuningBackground(absCents);
    accentColour = tuningAccent(absCents);
    centsSign = centsDeviation !== null ? centsDeviation >= 0 ? "+" : "" : "";
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="capture-view svelte-1c9uzgk"${attr_style(`background-color: ${stringify(bgColour)}`)}><div class="top-bar svelte-1c9uzgk"><button class="stop-btn svelte-1c9uzgk" aria-label="Stop session"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg> Stop</button> `);
      if (store_get($$store_subs ??= {}, "$sessionMode", sessionMode) !== "free") {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<span class="headphones-notice svelte-1c9uzgk">🎧 Use headphones</span>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (store_get($$store_subs ??= {}, "$sessionMode", sessionMode) !== "free" && timeLeft > 0) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<span class="countdown svelte-1c9uzgk"${attr_style(`color: ${stringify(accentColour)}`)}>${escape_html(formatCountdown(timeLeft))}</span>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div> <div class="pitch-display svelte-1c9uzgk">`);
      if (degreeLabel !== null && centsDeviation !== null) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="degree-label svelte-1c9uzgk"${attr_style(`color: ${stringify(accentColour)}`)}>${escape_html(degreeLabel)}</div> <div class="cents-readout svelte-1c9uzgk"${attr_style(`color: ${stringify(accentColour)}`)}>${escape_html(centsSign)}${escape_html(Math.round(centsDeviation))}¢</div> `);
        if (store_get($$store_subs ??= {}, "$sessionMode", sessionMode) !== "free" && currentTargetMidi !== null) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<div class="target-hint svelte-1c9uzgk">target note playing</div>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]-->`);
      } else {
        $$renderer3.push("<!--[!-->");
        $$renderer3.push(`<div class="silence-hint svelte-1c9uzgk">Sing into your microphone…</div>`);
      }
      $$renderer3.push(`<!--]--></div> `);
      if (store_get($$store_subs ??= {}, "$audioError", audioError)) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<p class="error-msg svelte-1c9uzgk" role="alert">${escape_html(store_get($$store_subs ??= {}, "$audioError", audioError))}</p>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      CaptureControls($$renderer3, {
        get timeLeft() {
          return timeLeft;
        },
        set timeLeft($$value) {
          timeLeft = $$value;
          $$settled = false;
        },
        get currentTargetMidi() {
          return currentTargetMidi;
        },
        set currentTargetMidi($$value) {
          currentTargetMidi = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----> `);
      {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="countdown-overlay svelte-1c9uzgk"><!---->`);
        {
          $$renderer3.push(`<span class="countdown-number svelte-1c9uzgk">${escape_html(countdown)}</span>`);
        }
        $$renderer3.push(`<!----></div>`);
      }
      $$renderer3.push(`<!--]--></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function ReviewView($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let session, scaleLabel;
    let playheadFraction = 0;
    let isReplaying = false;
    let pausedAtFraction = 0;
    const drone = new DroneEngine();
    let replayAudio = "voice";
    let guideVolume = 0.05;
    let saveStatus = "idle";
    function stopReplay() {
      drone.stop(void 0);
      pausedAtFraction = playheadFraction;
      isReplaying = false;
    }
    onDestroy(() => {
      stopReplay();
    });
    drone.setVolume(guideVolume);
    session = store_get($$store_subs ??= {}, "$completedSession", completedSession);
    get(musicContext).getScaleTones();
    {
      if (session?.targetSequence && session.targetSequence.length > 0) {
        Math.min(...session.targetSequence) - 2;
        Math.max(...session.targetSequence) + 2;
      } else {
        const midis = (session?.tracePoints ?? []).map((p) => p.smoothedMidi).sort((a, b) => a - b);
        if (midis.length > 0) {
          midis[Math.floor(midis.length * 0.05)];
          midis[Math.floor(midis.length * 0.95)];
        }
      }
    }
    session?.tracePoints[0]?.timestamp ?? 0;
    session?.durationMs ?? 1;
    scaleLabel = session ? `${session.key} ${SCALES[session.scale]?.name ?? session.scale}` : "";
    $$renderer2.push(`<div class="review-view svelte-1ru40ag"><header class="summary-bar svelte-1ru40ag"><div class="summary-left svelte-1ru40ag"><span class="summary-key svelte-1ru40ag">${escape_html(
      // Hard-stop everything and tear down the old AudioContext entirely.
      // This guarantees no previous AudioBufferSourceNode keeps playing.
      /**/
      // --- Real voice audio playback ---
      // --- Guide tone setup ---
      // Fall back to deriving beat duration from session length / sequence length if
      // tempoBpm wasn't recorded (old sessions before the field was added)
      // Anchor to AudioContext clock so everything stays in sync.
      // Subtract offsetSec so elapsed starts at the seek position.
      // Guide tone: advance at original beat tempo
      // Redraw canvas with updated playhead
      /* already ended */
      // Decode voice recording blob into an AudioBuffer for playback
      // Non-fatal — voice replay just won't work
      scaleLabel
    )}</span> <span class="summary-sep svelte-1ru40ag">·</span> <span class="summary-mode svelte-1ru40ag">${escape_html(session?.mode ?? "")}</span></div> `);
    if (session?.score) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div${attr_class(`grade-badge grade-${stringify(session.score.grade.toLowerCase())}`, "svelte-1ru40ag")}>${escape_html(session.score.grade)}</div> <div class="score-detail svelte-1ru40ag">${escape_html(Math.round(session.score.percentOnScale))}% on scale</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></header> <div class="canvas-area svelte-1ru40ag"><canvas class="review-canvas svelte-1ru40ag" aria-label="Session timeline"></canvas></div> <footer class="action-bar svelte-1ru40ag"><button${attr_class("replay-btn svelte-1ru40ag", void 0, { "active": isReplaying })}>`);
    if (isReplaying) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg> Pause`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"></polygon></svg>${escape_html(pausedAtFraction > 0 ? "Resume" : "Replay")}`);
    }
    $$renderer2.push(`<!--]--></button> `);
    if (session?.targetSequence) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="audio-toggle svelte-1ru40ag" role="group" aria-label="Replay audio"><!--[-->`);
      const each_array = ensure_array_like([["voice", "🎤"], ["guide", "🎵"], ["both", "🎤🎵"]]);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let [val, label] = each_array[$$index];
        $$renderer2.push(`<button${attr_class("audio-btn svelte-1ru40ag", void 0, { "active": replayAudio === val })}${attr("aria-pressed", replayAudio === val)}${attr("title", val === "voice" ? "Hear your voice" : val === "guide" ? "Hear guide tone" : "Hear both")}>${escape_html(label)}</button>`);
      }
      $$renderer2.push(`<!--]--></div> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <button class="save-btn svelte-1ru40ag"${attr("disabled", saveStatus === "saved", true)}>`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Save`);
    }
    $$renderer2.push(`<!--]--></button> <button class="back-btn svelte-1ru40ag">← New Run</button></footer></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function HistoryView($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="history-view svelte-1fcek86"><header class="history-header svelte-1fcek86"><button class="back-btn svelte-1fcek86">← Back</button> <h2 class="history-title svelte-1fcek86">Session History</h2></header> <div class="history-list svelte-1fcek86">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="state-msg svelte-1fcek86">Loading…</p>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
function _page($$renderer) {
  var $$store_subs;
  head("1uha8ag", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Vocal Pitch Trainer</title>`);
    });
    $$renderer2.push(`<meta name="description" content="Real-time pitch trainer for singers"/>`);
  });
  if (store_get($$store_subs ??= {}, "$appPhase", appPhase) === "idle") {
    $$renderer.push("<!--[-->");
    IdleView($$renderer);
  } else if (store_get($$store_subs ??= {}, "$appPhase", appPhase) === "capturing") {
    $$renderer.push("<!--[1-->");
    CaptureView($$renderer);
  } else if (store_get($$store_subs ??= {}, "$appPhase", appPhase) === "reviewing") {
    $$renderer.push("<!--[2-->");
    ReviewView($$renderer);
  } else if (store_get($$store_subs ??= {}, "$appPhase", appPhase) === "history") {
    $$renderer.push("<!--[3-->");
    HistoryView($$renderer);
  } else {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]-->`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
}
export {
  _page as default
};

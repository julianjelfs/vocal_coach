import { w as writable, d as derived } from "./index.js";
const appPhase = writable("idle");
const sessionMode = writable("free");
const runDurationSecs = writable(30);
const noiseGateThreshold = writable(5e-3);
const tempoBpm = writable(60);
const canInstallPWA = writable(false);
const SCALES = {
  major: {
    name: "Major",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    degreeLabels: ["1", "2", "3", "4", "5", "6", "7"]
  },
  naturalMinor: {
    name: "Natural Minor",
    intervals: [0, 2, 3, 5, 7, 8, 10],
    degreeLabels: ["1", "2", "♭3", "4", "5", "♭6", "♭7"]
  },
  harmonicMinor: {
    name: "Harmonic Minor",
    intervals: [0, 2, 3, 5, 7, 8, 11],
    degreeLabels: ["1", "2", "♭3", "4", "5", "♭6", "7"]
  },
  melodicMinor: {
    name: "Melodic Minor",
    intervals: [0, 2, 3, 5, 7, 9, 11],
    degreeLabels: ["1", "2", "♭3", "4", "5", "6", "7"]
  },
  pentatonicMajor: {
    name: "Pentatonic Major",
    intervals: [0, 2, 4, 7, 9],
    degreeLabels: ["1", "2", "3", "5", "6"]
  },
  pentatonicMinor: {
    name: "Pentatonic Minor",
    intervals: [0, 3, 5, 7, 10],
    degreeLabels: ["1", "♭3", "4", "5", "♭7"]
  },
  chromatic: {
    name: "Chromatic",
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    degreeLabels: ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"]
  }
};
const KEY_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const KEY_MIDI_OFFSETS = {
  C: 0,
  "C♯": 1,
  D: 2,
  "E♭": 3,
  E: 4,
  F: 5,
  "F♯": 6,
  G: 7,
  "A♭": 8,
  A: 9,
  "B♭": 10,
  B: 11
};
const A4_FREQ = 440;
const A4_MIDI = 69;
function midiToFreq(midi) {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}
function freqToMidi(freq) {
  return A4_MIDI + 12 * Math.log2(freq / A4_FREQ);
}
function centsBetween(detected, reference) {
  return 1200 * Math.log2(detected / reference);
}
class MusicContext {
  scaleTones = [];
  buildScale(keyName, scaleType, octaveMin2 = 2, octaveMax2 = 6) {
    const rootOffset = KEY_MIDI_OFFSETS[keyName] ?? 0;
    const def = SCALES[scaleType];
    this.scaleTones = [];
    for (let octave = octaveMin2; octave <= octaveMax2 + 1; octave++) {
      const cMidi = 12 * (octave + 1);
      for (let di = 0; di < def.intervals.length; di++) {
        const midi = cMidi + rootOffset + def.intervals[di];
        if (midi < 36 || midi > 96) continue;
        this.scaleTones.push({
          midi,
          frequency: midiToFreq(midi),
          degree: di,
          degreeLabel: def.degreeLabels[di],
          octave
        });
      }
    }
    const seen = /* @__PURE__ */ new Set();
    this.scaleTones = this.scaleTones.filter((t) => {
      if (seen.has(t.midi)) return false;
      seen.add(t.midi);
      return true;
    }).sort((a, b) => a.midi - b.midi);
  }
  analyse(frequency) {
    const midiValue = freqToMidi(frequency);
    let nearestTone = this.scaleTones[0];
    let minDist = Infinity;
    for (const tone of this.scaleTones) {
      const dist = Math.abs(tone.midi - midiValue);
      if (dist < minDist) {
        minDist = dist;
        nearestTone = tone;
      }
    }
    const centsDeviation = centsBetween(frequency, nearestTone.frequency);
    return {
      rawFrequency: frequency,
      midiValue,
      nearestTone,
      centsDeviation,
      isOnScale: Math.abs(centsDeviation) < 25
    };
  }
  getScaleTones() {
    return this.scaleTones;
  }
  getFrequencyForDegree(degreeIndex, preferredOctave = 4) {
    const candidates = this.scaleTones.filter((t) => t.degree === degreeIndex);
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => Math.abs(a.octave - preferredOctave) - Math.abs(b.octave - preferredOctave));
    return candidates[0].frequency;
  }
}
const selectedKey = writable("C");
const selectedScale = writable("major");
const octaveMin = writable(3);
const octaveMax = writable(5);
const selectedOctave = writable(4);
const musicContext = derived(
  [selectedKey, selectedScale, octaveMin, octaveMax],
  ([$key, $scale, $min, $max]) => {
    const ctx = new MusicContext();
    ctx.buildScale($key, $scale, $min, $max);
    return ctx;
  }
);
derived(selectedScale, ($scale) => {
  return SCALES[$scale].degreeLabels;
});
export {
  KEY_NAMES as K,
  SCALES as S,
  selectedKey as a,
  selectedScale as b,
  canInstallPWA as c,
  selectedOctave as d,
  appPhase as e,
  midiToFreq as f,
  musicContext as m,
  noiseGateThreshold as n,
  runDurationSecs as r,
  sessionMode as s,
  tempoBpm as t
};

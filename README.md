# Vocal Coach

A real-time pitch training app for singers. Sing into your microphone and see exactly where your voice sits in the scale — then review, replay, and track your progress over time.

Runs entirely in the browser. No account, no server, no subscription.

---

## What it does

**Vocal Coach** listens to your voice in real time, identifies the pitch you're singing, and shows you how close you are to the nearest scale tone. After each session you get a full timeline replay with a grade, so you can actually hear and see where you drifted.

### Three practice modes

**Free** — Sing whatever you like. The app tracks your pitch against the current key and scale and shows you which degree you're hitting. Good for warm-ups and exploration.

**Scale** — A guide tone plays each note of the scale in order (ascending then descending) at a steady tempo. Your job is to match it. The full sequence repeats until the timer runs out.

**Interval** — The guide tone plays root → 2nd → root → 3rd → root → 4th … up through the 7th, cycling continuously. Useful for ear training and internalising interval distances.

### Live feedback

- The background colour shifts in real time: **teal** means you're in tune (within ±15¢), **amber** means you're close (±30¢), **grey** means you're off.
- The current scale degree (e.g. `♭3`, `5`) is shown large in the centre of the screen.
- Cents deviation is shown below it so you know which direction to adjust.

### Review & replay

After every session you get a full-width timeline canvas showing your entire pitch trace against the target notes. You can:

- Click anywhere on the canvas to jump to that point
- Play back your recorded voice, the guide tone, or both together
- Adjust the guide tone volume independently
- See your grade (S / A / B / C / D) and percentage on-scale

Sessions are saved to IndexedDB (locally in your browser) so you can come back to them later, compare runs, and track improvement over time.

---

## Configuration

On the idle screen before each session you can set:

| Option | Details |
|--------|---------|
| **Mode** | Free / Scale / Interval |
| **Key** | All 12 chromatic keys |
| **Scale** | Major, Natural Minor, Harmonic Minor, Melodic Minor, Pentatonic Major, Pentatonic Minor, Chromatic |
| **Octave** | Which octave the guide tone and scale range targets |
| **Duration** | 15s / 30s / 60s or custom (Scale and Interval modes) |
| **Noise gate** | Calibrate the silence threshold so background noise doesn't register as pitch |

A **reference tone** button lets you hear the root note before starting.

---

## Scoring

At the end of each session, trace points where your pitch was more than ±25 cents from the nearest scale tone are counted as off-scale. Transition noise between notes is filtered out before scoring.

| Grade | On-scale |
|-------|---------|
| S | ≥ 90% |
| A | ≥ 75% |
| B | ≥ 60% |
| C | ≥ 45% |
| D | < 45% |

---

## Tech

- **SvelteKit** + TypeScript, deployed as a static PWA (installable, works offline)
- **YIN algorithm** running in an AudioWorklet for low-latency fundamental frequency detection
- **Web Audio API** for the guide tone (sawtooth oscillator → high-pass filter, with a short attack envelope on each note change)
- **MediaRecorder** captures your voice for post-session playback
- **IndexedDB** (via `idb`) stores session history locally — nothing leaves your device

---

## Development

```bash
npm install
npm run dev
```

```bash
npm run build    # production build
npm run preview  # preview the build locally
```

Requires a browser with AudioWorklet and MediaRecorder support (all modern browsers).

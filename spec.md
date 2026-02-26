Vocal Scale Pitch Visualiser – PWA Specification

1. Purpose

A Progressive Web App that listens to live vocal input and provides real-time visual feedback on pitch accuracy relative to a user-selected key and scale, emphasising musical context rather than raw chromatic correctness.

Primary goal:
Help singers internalise scale degrees and pitch centre through visual reinforcement, not shame.

Non-goal:
Replacing DAWs, vocal coaches, or human ears.

2. Target Platform

Platform: Web (PWA)

Devices: Mobile-first, desktop supported

Browsers:

Chrome (Android, desktop) – primary

Safari (iOS) – secondary, with caveats

Firefox – best effort

3. Core Features
   3.1 Audio Input

Microphone capture via Web Audio API

Mono input

Sample rate: browser default (typically 44.1kHz or 48kHz)

Automatic gain handling (no user knobs, singers already have enough anxiety)

3.2 Pitch Detection

Requirements

Real-time fundamental frequency detection

Stable for:

Vibrato

Slow pitch slides

Breath noise

Recommended Algorithms

YIN or McLeod Pitch Method (MPM)

Fallback to autocorrelation if performance tanks

Constraints

Latency target: ≤ 50 ms end-to-end

Update rate: 30–60 Hz (visual smoothing will lie politely)

3.3 Musical Context Engine

Inputs

Key (e.g. C, Eb, F#)

Scale type:

Major

Natural minor

Harmonic minor

Melodic minor

Pentatonic (major/minor)

Chromatic (for the chaos crowd)

Processing

Generate scale tones across a configurable octave range

Store target frequencies using equal temperament

Map detected pitch to:

Nearest scale tone

Deviation in cents

Scale degree (1, ♭3, 5, etc.)

3.4 Visual Feedback System

This is the actual product. Everything else is plumbing.

Primary Visual

Continuous pitch trace (vertical axis = pitch, horizontal = time)

Scale tones rendered as horizontal “gravity bands”

Active target tone highlighted

Deviation Display

Offset shown as:

Distance from centre of gravity band

Optional numeric cents (toggleable, hidden by default)

Behaviour Rules

Non-scale pitches:

Fade visually

No red warnings

Vibrato:

Smoothed centre tracked separately from oscillation

Slides:

Visual continuity preserved (no snapping)

3.5 Session Modes

Practice Mode

Free singing

Full visual feedback

No scoring

Target Mode

User selects a specific scale degree

Gravity band emphasised

Optional drone reference tone

Phrase Mode (Phase 2)

Detect sustained pitch drift over phrases

Show average centre vs target

4. User Interface
   4.1 Layout

Portrait orientation first

One-hand usability

Minimal controls during singing

Core UI Elements

Start/Stop listening

Key selector

Scale selector

Octave range toggle

Visualiser canvas (dominant)

4.2 Visual Design Principles

Calm colours

No flashing

No judgement language

No green/red “correct/incorrect” metaphors

This is music, not airport security.

5. Technical Architecture
   5.1 Frontend

Framework: Svelte / SvelteKit (because you have taste)

Rendering:

Canvas or WebGL for pitch visualisation

SVG for static UI

5.2 Audio Pipeline

Web Audio API

AudioWorklet for pitch detection (preferred)

Fallback to ScriptProcessorNode if necessary (begrudgingly)

5.3 State Management

Lightweight store for:

Musical context

Current pitch

Smoothed pitch centre

UI state

No Redux. This is not a cry for help.

6. PWA Requirements

Offline Support

App shell cached

Core functionality works offline after first load

Installation

Web App Manifest

Home screen install prompt

Performance

First meaningful paint < 2s on mid-range mobile

CPU usage capped to avoid cooking phones mid-vocalise

7. Privacy & Permissions

Microphone access only while active

No audio recorded or stored

No analytics on pitch data

Trust is fragile. Don’t break it for a chart.

8. Accessibility

Colour-blind safe palettes

Optional numeric feedback

Large touch targets

Works without headphones (with warning, not scolding)

9. Risks & Constraints

iOS audio latency will misbehave. Accept this emotionally now.

Browser pitch detection is imperfect. Smooth aggressively.

Singing is messy. Design must forgive.

10. Phase 2 Ideas (When You’re Feeling Ambitious)

Adaptive scale suggestions based on pitch clusters

MIDI output for DAW integration

Vocal range profiling

Teacher mode with recording and playback

11. Success Criteria

The app succeeds if:

Beginners stop asking “am I terrible”

Singers understand where they are in the scale

You don’t accidentally turn this into a gamified self-esteem grinder

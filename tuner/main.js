
import { AudioEngine } from './audio.js';

const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

class TunerApp {
    constructor() {
        this.audioEngine = new AudioEngine();
        this.refFreq = 440;
        this.isPlayingRef = false;

        // UI Elements
        this.startBtn = document.getElementById('start-btn');
        this.playRefBtn = document.getElementById('play-ref-btn');
        this.refFreqInput = document.getElementById('ref-freq');
        this.themeToggle = document.getElementById('theme-toggle');

        this.noteLetter = document.getElementById('note-letter');
        this.noteSharp = document.getElementById('note-sharp');
        this.noteOctave = document.getElementById('note-octave');
        this.centsDisplay = document.getElementById('cents-display');

        this.canvas = document.getElementById('tuner-gauge');
        this.ctx = this.canvas.getContext('2d');

        this.visualState = {
            currentCents: 0,
            targetCents: 0
        };

        this.bindEvents();
        this.initTheme();
        this.loop();
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.toggleMicrophone());
        this.playRefBtn.addEventListener('click', () => this.toggleRefTone());
        this.refFreqInput.addEventListener('change', (e) => {
            this.refFreq = parseInt(e.target.value) || 440;
            if (this.isPlayingRef) {
                this.audioEngine.playTone(this.refFreq); // Update tone if playing
            }
        });

        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    initTheme() {
        const storedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', storedTheme);
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    }

    async toggleMicrophone() {
        if (this.audioEngine.isListening) {
            this.audioEngine.stopMicrophone();
            this.startBtn.textContent = "Start Mic";
            this.startBtn.classList.remove('active');
            this.resetDisplay();
        } else {
            try {
                await this.audioEngine.startMicrophone();
                this.startBtn.textContent = "Stop Mic";
                this.startBtn.classList.add('active');
            } catch (err) {
                alert('Could not access microphone.');
            }
        }
    }

    toggleRefTone() {
        if (this.isPlayingRef) {
            this.audioEngine.stopTone();
            this.playRefBtn.textContent = "Play Tone";
            this.playRefBtn.classList.remove('active');
            this.isPlayingRef = false;
        } else {
            this.audioEngine.playTone(this.refFreq);
            this.playRefBtn.textContent = "Stop Tone";
            this.playRefBtn.classList.add('active');
            this.isPlayingRef = true;
        }
    }

    updatePitch() {
        const pitch = this.audioEngine.getPitch();
        if (pitch) {
            const noteData = this.getNote(pitch);
            this.updateDisplay(noteData);
            this.visualState.targetCents = noteData.cents;
        } else {
            // Silence handling - keep needle falling or stay still?
            // For now, do nothing on silence, let user see last note or maybe we should drift?
            // Just leaving it allows reading the last note.
        }
    }

    getNote(frequency) {
        const noteNum = 12 * (Math.log(frequency / this.refFreq) / Math.log(2));
        const midiNum = Math.round(noteNum) + 69;
        const noteName = NOTE_STRINGS[midiNum % 12];
        const octave = Math.floor(midiNum / 12) - 1;
        const deviation = Math.floor((noteNum - Math.round(noteNum)) * 100);

        return {
            noteName,
            octave,
            cents: deviation,
            frequency
        };
    }

    updateDisplay(data) {
        const letter = data.noteName.charAt(0);
        const sharp = data.noteName.length > 1 ? data.noteName.charAt(1) : "";

        this.noteLetter.textContent = letter;
        this.noteSharp.textContent = sharp;
        this.noteOctave.textContent = data.octave;

        const sign = data.cents > 0 ? "+" : "";
        this.centsDisplay.textContent = `${sign}${data.cents} cents`;

        // Continuous Color based on tuning
        const absCents = Math.abs(data.cents);
        const sensitivity = 50;
        // Map 0 -> 120 (Green), 50 -> 0 (Red)
        const hue = Math.max(0, 120 - (Math.min(sensitivity, absCents) / sensitivity) * 120);

        this.centsDisplay.style.color = `hsl(${hue}, 90%, 50%)`;

        // Add glow effect/shadow if in tune
        if (absCents < 5) {
            this.noteLetter.style.textShadow = `0 0 30px hsl(${hue}, 90%, 50%)`;
        } else {
            this.noteLetter.style.textShadow = `0 0 20px rgba(56, 189, 248, 0.2)`; // Default Back
        }
    }

    resetDisplay() {
        this.noteLetter.textContent = "--";
        this.noteSharp.textContent = "";
        this.noteOctave.textContent = "";
        this.centsDisplay.textContent = "0 cents";
        this.visualState.targetCents = 0;
        this.centsDisplay.style.color = '';
        this.noteLetter.style.textShadow = '';
    }

    drawGauge() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, w, h);

        // Center point
        const cx = w / 2;
        const cy = h - 20;
        const radius = Math.min(w, h * 2) / 2 - 20;

        // Draw Arc Background
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, 0); // 180 degree arc
        ctx.lineWidth = 10;
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim() + '33'; // low opacity
        ctx.stroke();

        // Draw Tick Marks
        for (let i = -50; i <= 50; i += 10) {
            const angle = Math.PI + (i + 50) / 100 * Math.PI;

            const startR = radius - 15;
            const endR = radius - (i === 0 ? 30 : 20); // Center tick is longer

            const sx = cx + Math.cos(angle) * startR;
            const sy = cy + Math.sin(angle) * startR;
            const ex = cx + Math.cos(angle) * endR;
            const ey = cy + Math.sin(angle) * endR;

            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.lineWidth = i === 0 ? 3 : 2;
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim();
            ctx.stroke();
        }

        // Draw Needle
        // Smooth interpolation
        this.visualState.currentCents += (this.visualState.targetCents - this.visualState.currentCents) * 0.2;

        // Map cents (-50 to +50) to angle (Math.PI to 0 -- actually Math.PI is left, 0 is right)
        // -50 cents = PI, +50 cents = 0? No.
        // Left is flat (-), Right is sharp (+)
        // Let's say -50 is 180deg (Math.PI), +50 is 0deg (0).
        // Center 0 is 90deg (Math.PI/2) -- Wait, standard canvas arc: 0 is right, PI is left.
        // So 0 cents should be -Math.PI/2 (top) ?? 
        // No, we are drawing a semi-circle from PI (left) to 0 (right).
        // So -50 cents -> PI.
        // 0 cents -> PI/2 (Up).
        // +50 cents -> 0.
        // Formula: angle = Math.PI - ((cents + 50) / 100) * Math.PI

        // Clamp cents for visual
        const clampedCents = Math.max(-50, Math.min(50, this.visualState.currentCents));
        const normalized = (clampedCents + 50) / 100; // 0 to 1
        const needleAngle = Math.PI - normalized * Math.PI;

        const nx = cx + Math.cos(needleAngle) * (radius - 10);
        const ny = cy + Math.sin(needleAngle) * (radius - 10);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.lineWidth = 4;

        // Continuous Color Logic (Green -> Yellow -> Red)
        const absVal = Math.abs(this.visualState.currentCents);
        const sensitivity = 50;
        const hue = Math.max(0, 120 - (Math.min(sensitivity, absVal) / sensitivity) * 120);

        ctx.strokeStyle = `hsl(${hue}, 90%, 50%)`;
        ctx.shadowColor = `hsl(${hue}, 90%, 50%)`;
        ctx.shadowBlur = absVal < 5 ? 15 : 0; // Glow when in tune

        ctx.stroke();
        ctx.shadowBlur = 0; // Reset

        // Pivot circle
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
    }

    loop() {
        if (this.audioEngine.isListening) {
            this.updatePitch();
        }
        this.drawGauge();
        requestAnimationFrame(() => this.loop());
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    new TunerApp();
});


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
        this.refSlider = document.getElementById('ref-slider');
        this.themeToggle = document.getElementById('theme-toggle');

        this.noteLetter = document.getElementById('note-letter');
        this.noteSharp = document.getElementById('note-sharp');
        this.noteOctave = document.getElementById('note-octave');
        this.centsDisplay = document.getElementById('cents-display');
        this.freqDisplay = document.getElementById('freq-display');

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

        // Sync Input -> Slider
        this.refFreqInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value) || 440;
            // Clamp value
            if (val < 428) val = 428;
            if (val > 452) val = 452;

            this.refFreq = val;
            this.refSlider.value = val;
            this.updateToneIfPlaying();
        });

        // Sync Slider -> Input
        this.refSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.refFreq = val;
            this.refFreqInput.value = val;
            this.updateToneIfPlaying();
        });

        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    updateToneIfPlaying() {
        if (this.isPlayingRef) {
            this.audioEngine.playTone(this.refFreq);
        }
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
            this.playRefBtn.textContent = "Tone";
            this.playRefBtn.classList.remove('active');
            this.isPlayingRef = false;
        } else {
            this.audioEngine.playTone(this.refFreq);
            this.playRefBtn.textContent = "Stop";
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
            // Keep previous display to avoid flickering, or maybe fade?
            // Usually tuners hold the last note for a bit.
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
        this.freqDisplay.textContent = `${data.frequency.toFixed(1)} Hz`;

        // Continuous Color based on tuning
        const absCents = Math.abs(data.cents);
        const sensitivity = 50;
        const hue = Math.max(0, 120 - (Math.min(sensitivity, absCents) / sensitivity) * 120);

        // Adjust Lightness based on Theme for contrast
        const theme = document.documentElement.getAttribute('data-theme');
        const lightness = theme === 'light' ? '40%' : '50%';

        const color = `hsl(${hue}, 90%, ${lightness})`;

        this.centsDisplay.style.color = color;
        this.freqDisplay.style.color = color;

        // Glow effect
        if (absCents < 5) {
            this.noteLetter.style.textShadow = `0 0 30px ${color}`;
        } else {
            this.noteLetter.style.textShadow = `0 0 20px rgba(56, 189, 248, 0.2)`;
        }
    }

    resetDisplay() {
        this.noteLetter.textContent = "--";
        this.noteSharp.textContent = "";
        this.noteOctave.textContent = "";
        this.centsDisplay.textContent = "0 cents";
        this.freqDisplay.textContent = "-- Hz";
        this.visualState.targetCents = 0;
        this.centsDisplay.style.color = '';
        this.freqDisplay.style.color = '';
        this.noteLetter.style.textShadow = '';
    }

    drawGauge() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h - 20;
        const radius = Math.min(w, h * 2) / 2 - 20;

        // Background Arc
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, 0);
        ctx.lineWidth = 10;
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim() + '33';
        ctx.stroke();

        // Tick Marks
        for (let i = -50; i <= 50; i += 10) {
            // Map -50 (Left/PI) to +50 (Right/2PI)
            const angle = Math.PI + (i + 50) / 100 * Math.PI;

            const startR = radius - 15;
            const endR = radius - (i === 0 ? 30 : 20);

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

        // Needle
        this.visualState.currentCents += (this.visualState.targetCents - this.visualState.currentCents) * 0.2;

        // Clamp
        const clampedCents = Math.max(-50, Math.min(50, this.visualState.currentCents));
        const normalized = (clampedCents + 50) / 100; // 0 to 1

        // Correct Angle Logic:
        // 0 (Left/PI) -> 1 (Right/2PI)
        const needleAngle = Math.PI + normalized * Math.PI;

        const nx = cx + Math.cos(needleAngle) * (radius - 10);
        const ny = cy + Math.sin(needleAngle) * (radius - 10);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.lineWidth = 4;

        // Color Logic
        const absVal = Math.abs(this.visualState.currentCents);
        const sensitivity = 50;
        const hue = Math.max(0, 120 - (Math.min(sensitivity, absVal) / sensitivity) * 120);

        const theme = document.documentElement.getAttribute('data-theme');
        const lightness = theme === 'light' ? '40%' : '50%';

        ctx.strokeStyle = `hsl(${hue}, 90%, ${lightness})`;
        ctx.shadowColor = `hsl(${hue}, 90%, ${lightness})`;
        ctx.shadowBlur = absVal < 5 ? 15 : 0;

        ctx.stroke();
        ctx.shadowBlur = 0;

        // Pivot
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

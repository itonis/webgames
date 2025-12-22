export class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.mediaStreamSource = null;
        this.buffer = null;
        this.isListening = false;
        this.oscillator = null;
        this.gainNode = null;

        // Worker
        this.worker = new Worker('pitch-worker.js');
        this.worker.onmessage = (e) => {
            this.handleWorkerMessage(e.data);
        };

        // State
        this.latestPitch = null;
        this.pitchBuffer = []; // Array of { timestamp, pitch }
        this.smoothingWindowMs = 150; // default
    }

    setSmoothingWindow(ms) {
        this.smoothingWindowMs = ms;
    }

    async init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    async startMicrophone() {
        await this.init();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 4096;
            this.mediaStreamSource.connect(this.analyser);
            this.buffer = new Float32Array(this.analyser.fftSize);
            this.isListening = true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            throw error;
        }
    }

    stopMicrophone() {
        if (this.mediaStreamSource) {
            this.mediaStreamSource.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStreamSource.disconnect();
            this.mediaStreamSource = null;
        }
        this.isListening = false;
        this.pitchBuffer = [];
        this.latestPitch = null;
    }

    handleWorkerMessage(rawPitch) {
        const now = performance.now();

        // Add valid pitch to buffer
        if (rawPitch !== -1) {
            this.pitchBuffer.push({ timestamp: now, pitch: rawPitch });
        }

        // Remove old samples
        const cutoff = now - this.smoothingWindowMs;
        while (this.pitchBuffer.length > 0 && this.pitchBuffer[0].timestamp < cutoff) {
            this.pitchBuffer.shift();
        }

        // Calculate Average
        if (this.pitchBuffer.length > 0) {
            const sum = this.pitchBuffer.reduce((acc, item) => acc + item.pitch, 0);
            this.latestPitch = sum / this.pitchBuffer.length;
        } else {
            this.latestPitch = null;
        }
    }

    getPitch() {
        if (!this.isListening || !this.analyser) return null;

        // Post current data to worker for NEXT frame's result
        this.analyser.getFloatTimeDomainData(this.buffer);
        // We do not transfer the buffer because we reuse the same Float32Array instance.
        // Wait, standard postMessage clones. If we want zero-copy we should use transferables,
        // but TypedArrays on the main thread that are constantly reused by AnalyserNode cannot be neutered.
        // So cloning is the only safe way unless we alternate two buffers.
        // For 4k floats (16KB), cloning is cheap enough.
        this.worker.postMessage({
            buffer: this.buffer,
            sampleRate: this.audioContext.sampleRate
        });

        // Return the *last calculated* pitch (from the worker's previous reply)
        return this.latestPitch;
    }

    playTone(frequency) {
        this.init();
        if (this.oscillator) this.stopTone();

        this.oscillator = this.audioContext.createOscillator();
        this.gainNode = this.audioContext.createGain();

        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        // Soft attack and release
        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 0.1);

        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        this.oscillator.start();
    }

    stopTone() {
        if (this.oscillator) {
            this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
            this.oscillator.stop(this.audioContext.currentTime + 0.1);
            this.oscillator = null;
        }
    }
}

export class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.mediaStreamSource = null;
        this.buffer = null;
        this.isListening = false;
        this.oscillator = null;
        this.gainNode = null;

        // Smoothing State
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
    }

    getPitch() {
        if (!this.isListening || !this.analyser) return null;

        this.analyser.getFloatTimeDomainData(this.buffer);
        const rawPitch = this.autoCorrelate(this.buffer, this.audioContext.sampleRate);

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
        if (this.pitchBuffer.length === 0) return null;

        const sum = this.pitchBuffer.reduce((acc, item) => acc + item.pitch, 0);
        return sum / this.pitchBuffer.length;
    }

    // Auto-correlation algorithm to determine fundamental frequency
    autoCorrelate(buffer, sampleRate) {
        let size = buffer.length;
        let rms = 0;

        // Calculate Root Mean Square to determine if there's enough signal
        for (let i = 0; i < size; i++) {
            const val = buffer[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / size);

        // Threshold for silence/noise
        if (rms < 0.01) return -1;

        // Clip the buffer to the first half
        let r1 = 0, r2 = size - 1, thres = 0.2;
        for (let i = 0; i < size / 2; i++) {
            if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
        }
        for (let i = 1; i < size / 2; i++) {
            if (Math.abs(buffer[size - i]) < thres) { r2 = size - i; break; }
        }

        buffer = buffer.slice(r1, r2);
        size = buffer.length;

        // Perform autocorrelation
        const c = new Array(size).fill(0);
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size - i; j++) {
                c[i] = c[i] + buffer[j] * buffer[j + i];
            }
        }

        let d = 0;
        while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < size; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }
        let T0 = maxpos;

        // Interpolation logic for better precision
        let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
        let a = (x1 + x3 - 2 * x2) / 2;
        let b = (x3 - x1) / 2;
        if (a) T0 = T0 - b / (2 * a);

        return sampleRate / T0;
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

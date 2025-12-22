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
        // Downsampling optimization
        // If buffer is large, downsample to reduce CPU usage. 
        // 4096 samples at 48kHz is ~85ms. 
        // Downsampling by 4 gives 1024 samples at 12kHz.
        // Highest detectable freq becomes 6kHz (Nyquist), which is plenty for tuning.
        if (buffer.length > 2048) {
            const stride = 4;
            const downsampledLength = Math.floor(buffer.length / stride);
            const downsampledBuffer = new Float32Array(downsampledLength);
            for (let i = 0; i < downsampledLength; i++) {
                downsampledBuffer[i] = buffer[i * stride];
            }
            return this.autoCorrelate(downsampledBuffer, sampleRate / stride);
        }

        let size = buffer.length;
        let rms = 0;

        // Calculate Root Mean Square
        for (let i = 0; i < size; i++) {
            const val = buffer[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / size);

        // Threshold for silence
        if (rms < 0.01) return -1;

        // Optimization: Limit correlations to a valid pitch range
        // For 1024 samples (downsampled), we still want to cover low frequencies.
        // MAX_LAG of size is safe (covers full buffer duration).
        // For 1024 samples at 12kHz, duration is ~85ms (Min freq ~11Hz).
        const MAX_LAG = Math.floor(size * 0.9); // Don't go to the very edge

        const c = new Array(MAX_LAG).fill(0);
        for (let i = 0; i < MAX_LAG; i++) {
            let sum = 0;
            // Correlate
            for (let j = 0; j < size - i; j++) {
                sum += buffer[j] * buffer[j + i];
            }
            c[i] = sum;
        }

        // Find the first major peak after the first valley
        let d = 0;
        // Descend to the first valley
        while (d < MAX_LAG - 1 && c[d] > c[d + 1]) {
            d++;
        }

        let maxval = -1, maxpos = -1;
        // Search for peak
        for (let i = d; i < MAX_LAG; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }

        let T0 = maxpos;
        if (T0 <= 0 || T0 >= MAX_LAG - 1) return -1; // No valid peak found

        // Interpolation
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

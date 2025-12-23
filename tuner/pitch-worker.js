
// Pitch detection algorithm running in a background thread

self.onmessage = function (e) {
    const { buffer, sampleRate } = e.data;
    const pitch = autoCorrelate(buffer, sampleRate);
    self.postMessage(pitch);
};

// Auto-correlation algorithm to determine fundamental frequency
function autoCorrelate(buffer, sampleRate) {
    // Downsampling optimization
    // If buffer is large, downsample to reduce CPU usage. 
    // 4096 samples at 48kHz is ~85ms. 
    // Downsampling by 4 gives 1024 samples at 12kHz.
    // Highest detectable freq becomes 6kHz (Nyquist), which is plenty for tuning.
    if (buffer.length > 2048) {
        const stride = 4;
        const downsampledLength = Math.floor(buffer.length / stride);
        // Optimization: In a worker, we can just allocate. 
        // GC pressure is less critical here than on UI thread, but still good to be mindful.
        // For simplicity/safety in this recursive call, we create new array.
        const downsampledBuffer = new Float32Array(downsampledLength);
        for (let i = 0; i < downsampledLength; i++) {
            downsampledBuffer[i] = buffer[i * stride];
        }
        return autoCorrelate(downsampledBuffer, sampleRate / stride);
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

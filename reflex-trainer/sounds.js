/* Base64 Encoded Minimalist Synth Sounds */

// Short beep for "Click to Stage" / Lights going down
const SND_BEEP_LOW = new Audio("data:audio/mp3;base64,//O0wAAAAAABgAAAAAAABgAAAAAAAAADjUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC5wae//O0wAEAAAABgAAAAAAABgAAAAAAAAADjUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC5wae//O0wBIAAAABgAAAAAAABgAAAAAAAAADjUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC5wae");
// Used as placeholders since real MP3s are too large for base64. 

// In a real application, we would use local file paths. 
// For this self-contained demo, we will generate synthetic beeps using the Web Audio API!

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSynth(type, freq, duration, vol = 0.1) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    // Envelope
    gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

const sounds = {
    revEngine: () => {
        // Simulating a low F1 engine idle hum
        playSynth('sawtooth', 150, 1.5, 0.2);
        setTimeout(() => playSynth('sawtooth', 160, 1.0, 0.2), 200);
    },
    lightDown: () => {
        // Red light beep
        playSynth('sine', 440, 0.2, 0.3);
    },
    goSignal: () => {
        // High pitched green light beep
        playSynth('sine', 880, 0.5, 0.4);
    },
    swatFly: () => {
        // Quick "thwack" sound
        playSynth('square', 100, 0.1, 0.4);
    },
    penaltyThud: () => {
        // Deep error thud for missing a fly
        playSynth('triangle', 50, 0.4, 0.5);
    },
    carBy: () => {
        // Doppler effect simulation for speed trap
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 1.5);

        gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.5);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.5);
    },
    drsSuccess: () => {
        playSynth('square', 1200, 0.2, 0.3);
        setTimeout(() => playSynth('square', 1600, 0.3, 0.3), 100);
    }
};

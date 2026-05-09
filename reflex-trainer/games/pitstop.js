/**
 * Pit Stop Challenge Game Logic
 */
const pitstopGame = {
    state: 'idle', // idle, playing, finished
    tiresChanged: 0,
    startTime: 0,
    tireOrder: [], // randomized order they light up
    currentTireTarget: null,

    overlay: document.getElementById('pitstop-overlay'),
    area: document.getElementById('pitstop-area'),
    counter: document.getElementById('pitstop-remaining'),
    prompt: document.getElementById('pitstop-prompt'),
    title: document.getElementById('pitstop-title'),
    desc: document.getElementById('pitstop-desc'),

    tires: {
        'fl': document.getElementById('tire-fl'),
        'fr': document.getElementById('tire-fr'),
        'rl': document.getElementById('tire-rl'),
        'rr': document.getElementById('tire-rr')
    },

    init() {
        this.reset();
    },

    reset() {
        this.state = 'idle';
        this.tiresChanged = 0;
        this.counter.textContent = '4';

        this.overlay.classList.remove('hidden');
        this.prompt.classList.remove('show');

        // Reset all tire visuals
        Object.values(this.tires).forEach(el => {
            el.className = el.className.replace(' active', '').replace(' done', '');
        });
    },

    start() {
        this.state = 'playing';
        this.overlay.classList.add('hidden');
        this.prompt.classList.remove('show');

        // Randomize tire order
        this.tireOrder = ['fl', 'fr', 'rl', 'rr'].sort(() => Math.random() - 0.5);
        this.tiresChanged = 0;

        if (typeof sounds !== 'undefined' && sounds.revEngine) sounds.revEngine();

        this.activateNextTire();
    },

    activateNextTire() {
        if (this.tiresChanged >= 4) {
            this.finish();
            return;
        }

        // Start timer on first tire activation
        if (this.tiresChanged === 0) {
            this.startTime = performance.now();
        }

        this.currentTireTarget = this.tireOrder[this.tiresChanged];
        const tireEl = this.tires[this.currentTireTarget];

        tireEl.classList.add('active');
    },

    hitTire(tireId) {
        if (this.state !== 'playing') return;

        if (tireId === this.currentTireTarget) {
            // Correct click
            const tireEl = this.tires[tireId];
            tireEl.classList.remove('active');
            tireEl.classList.add('done');

            if (typeof sounds !== 'undefined' && sounds.penaltyThud) {
                // Play a generic thud/swat sound for the wheel nut
                sounds.penaltyThud();
            }

            this.tiresChanged++;
            this.counter.textContent = 4 - this.tiresChanged;

            this.activateNextTire();
        } else {
            // Misclick
            this.triggerPenalty();
        }
    },

    triggerPenalty() {
        if (typeof sounds !== 'undefined' && sounds.missed) sounds.missed();

        // Flash screen red
        document.body.classList.add('penalty-flash');
        setTimeout(() => document.body.classList.remove('penalty-flash'), 100);

        // Add 500ms time penalty to start time artificially inflating total
        this.startTime -= 500;

        if (typeof app !== 'undefined' && app.triggerEngineerMessage) {
            app.triggerEngineerMessage("Wrong wheel gun! +0.5s penalty.");
        }
    },

    finish() {
        const endTime = performance.now();
        const totalTime = Math.round(endTime - this.startTime);

        this.state = 'finished';

        if (typeof sounds !== 'undefined' && sounds.goSignal) sounds.goSignal();

        // Reveal score
        this.title.textContent = `${(totalTime / 1000).toFixed(2)}s`;

        if (totalTime < 2000) this.desc.textContent = "World Record Stop!";
        else if (totalTime < 2500) this.desc.textContent = "Great Stop";
        else if (totalTime < 3000) this.desc.textContent = "Average Stop";
        else this.desc.textContent = "Slow Stop";

        this.prompt.classList.add('show');

        // Click anywhere on area to restart
        this.area.onclick = () => {
            if (this.state === 'finished') {
                this.area.onclick = null;
                this.reset();
                this.overlay.classList.remove('hidden');
            }
        };

        // Save best score
        if (typeof app !== 'undefined' && app.updateBestScore) {
            app.updateBestScore('pitstop', totalTime, true);
        }
    }
};

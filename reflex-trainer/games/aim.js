/**
 * Aim Trainer Game Logic
 */
const aimGame = {
    totalTargets: 15, // increased for multi-tracking
    targetsRemaining: 15,
    startTime: 0,
    times: [],
    lastClickTime: 0,
    maxSimultaneous: 3,
    activeTargets: [],
    moveInterval: null,

    area: document.getElementById('aim-area'),
    overlay: document.getElementById('aim-start-overlay'),
    remainingEl: document.getElementById('aim-remaining'),
    avgEl: document.getElementById('aim-avg'),

    init() {
        this.reset();
        this.area.addEventListener('mousedown', (e) => {
            if (this.targetsRemaining > 0 && this.targetsRemaining < this.totalTargets && !this.overlay.classList.contains('hidden') === false) {
                if (e.target === this.area) {
                    this.applyPenalty();
                }
            }
        });
    },

    reset() {
        this.targetsRemaining = this.totalTargets;
        this.times = [];
        this.updateStats();
        this.overlay.classList.remove('hidden');
        this.area.innerHTML = '';
        this.activeTargets = [];
        clearInterval(this.moveInterval);
    },

    start() {
        this.reset();
        this.overlay.classList.add('hidden');
        this.startTime = performance.now();
        this.lastClickTime = this.startTime;
        
        for (let i = 0; i < this.maxSimultaneous; i++) {
            this.spawnTarget();
        }

        // Start random movement loop
        this.moveInterval = setInterval(() => this.moveTargets(), 2000);
    },

    spawnTarget() {
        // Only spawn if we haven't reached the end condition
        // If targets on screen + already hit >= total, we shouldn't spawn more
        const targetsHit = this.totalTargets - this.targetsRemaining;
        const totalSpawnedSoFar = targetsHit + this.activeTargets.length;
        if (totalSpawnedSoFar >= this.totalTargets) {
            if (this.activeTargets.length === 0) {
                this.finish();
            }
            return;
        }

        const target = document.createElement('div');
        target.className = 'target moving';

        const rect = this.area.getBoundingClientRect();
        const margin = 30;
        const maxX = rect.width - margin * 2;
        const maxY = rect.height - margin * 2;

        const x = margin + Math.random() * maxX;
        const y = margin + Math.random() * maxY;

        target.style.left = `${x}px`;
        target.style.top = `${y}px`;

        target.onmousedown = (e) => {
            e.stopPropagation();
            this.hitTarget(target);
        };

        this.area.appendChild(target);
        this.activeTargets.push(target);
    },

    moveTargets() {
        const rect = this.area.getBoundingClientRect();
        const margin = 30;
        const maxX = rect.width - margin * 2;
        const maxY = rect.height - margin * 2;

        this.activeTargets.forEach(target => {
            const x = margin + Math.random() * maxX;
            const y = margin + Math.random() * maxY;
            target.style.left = `${x}px`;
            target.style.top = `${y}px`;
        });
    },

    hitTarget(target) {
        const now = performance.now();
        const timeToHit = now - this.lastClickTime;
        this.times.push(timeToHit);
        this.lastClickTime = now;

        this.targetsRemaining--;
        this.updateStats();

        target.style.transform = 'translate(-50%, -50%) scale(1.5)';
        target.style.opacity = '0';
        
        // Remove from active array
        this.activeTargets = this.activeTargets.filter(t => t !== target);

        setTimeout(() => target.remove(), 200);

        if (this.targetsRemaining <= 0) {
            this.finish();
        } else {
            this.spawnTarget();
        }
    },

    applyPenalty() {
        if (typeof sounds !== 'undefined') sounds.penaltyThud();

        document.body.classList.add('penalty-flash');
        setTimeout(() => document.body.classList.remove('penalty-flash'), 200);

        this.times.push(500);
        this.updateStats();

        if (typeof app !== 'undefined' && app.triggerEngineerMessage) {
            app.triggerEngineerMessage("Track limits, mate. Leave-a-da space!");
        }
    },

    updateStats() {
        this.remainingEl.textContent = this.targetsRemaining;

        if (this.times.length > 0) {
            const sum = this.times.reduce((a, b) => a + b, 0);
            const avg = Math.round(sum / this.times.length);
            this.avgEl.textContent = avg;
        } else {
            this.avgEl.textContent = '0';
        }
    },

    finish() {
        clearInterval(this.moveInterval);
        this.activeTargets.forEach(t => t.remove());
        this.activeTargets = [];

        this.overlay.classList.remove('hidden');

        const sum = this.times.reduce((a, b) => a + b, 0);
        const avg = this.times.length ? Math.round(sum / this.times.length) : 0;

        this.overlay.querySelector('h3').innerHTML = `
            Routine Complete!<br>
            <span style="font-size: 1.2rem; display: block; margin-top: 1rem; color: var(--text-secondary)">
                Average Time: <strong style="color: var(--accent-fuchsia)">${avg}ms</strong>
            </span>
            <span style="font-size: 1rem; display: block; margin-top: 0.5rem; color: var(--text-secondary)">Click to Restart</span>
        `;

        if (typeof app !== 'undefined' && app.updateBestScore) {
            app.updateBestScore('aim', avg, true);
        }
    }
};

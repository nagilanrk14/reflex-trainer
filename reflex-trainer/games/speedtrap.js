/**
 * Speed Trap Game Logic
 */
const speedTrapGame = {
    area: document.getElementById('speedtrap-area'),
    car: document.getElementById('speedtrap-car'),
    zone: document.getElementById('speedtrap-zone'),
    title: document.getElementById('speedtrap-title'),
    statText: document.getElementById('speedtrap-stat'),
    overlay: document.getElementById('speedtrap-overlay'),

    state: 'idle', // idle, moving, finished
    animationId: null,
    carX: -100,
    speed: 0,

    // Bounds
    areaWidth: 0,
    zoneStart: 0,
    zoneEnd: 0,

    init() {
        this.reset();
        // The click listener is on the whole area
        this.area.addEventListener('mousedown', this.handleClick.bind(this));
    },

    reset() {
        this.state = 'idle';
        this.overlay.classList.remove('hidden');
        this.car.style.left = '-100px';
        this.carX = -100;
        cancelAnimationFrame(this.animationId);
        this.title.textContent = 'SPEED TRAP';
        this.statText.textContent = '- ms diff';
    },

    start() {
        this.overlay.classList.add('hidden');
        this.state = 'moving';
        this.title.textContent = 'WAIT FOR IT...';
        this.statText.textContent = 'Ready';

        // Calculate physics based on screen size
        this.areaWidth = this.area.getBoundingClientRect().width;
        // The zone is centrally located in CSS, we need its X boundaries relative to the area
        const zoneRect = this.zone.getBoundingClientRect();
        const areaRect = this.area.getBoundingClientRect();

        this.zoneStart = zoneRect.left - areaRect.left;
        this.zoneEnd = this.zoneStart + zoneRect.width;

        // Random speed between 5px and 18px per frame
        this.speed = Math.random() * 13 + 5;

        // Start car completely off screen left
        this.carX = -100;
        this.car.style.left = `${this.carX}px`;

        sounds.carBy();
        this.animate();
    },

    animate() {
        if (this.state !== 'moving') return;

        this.carX += this.speed;
        this.car.style.left = `${this.carX}px`;

        // If car goes off screen right completely
        if (this.carX > this.areaWidth + 100) {
            this.finishMisfire('TOO LATE');
            return;
        }

        this.animationId = requestAnimationFrame(this.animate.bind(this));
    },

    handleClick(e) {
        if (this.state === 'idle' || this.state === 'finished') {
            // Do not start on click, user must use the overlay
            return;
        }

        if (this.state === 'moving') {
            this.checkHit();
        }
    },

    checkHit() {
        this.state = 'finished';
        cancelAnimationFrame(this.animationId);

        // The "hitbox" of the car: let's say the center of the car (car is 80px wide)
        const carCenter = this.carX + 40;
        const zoneCenter = this.zoneStart + (this.zoneEnd - this.zoneStart) / 2;

        if (carCenter >= this.zoneStart && carCenter <= this.zoneEnd) {
            // Hit! Calculate distance from perfect center in pixels, map roughly to ms for scoring
            const diffPx = Math.abs(carCenter - zoneCenter);
            const scoreMs = Math.round(diffPx * 2); // lower is better

            sounds.drsSuccess();
            this.title.textContent = 'DRS ENABLED';
            this.title.style.color = 'var(--accent-green)';
            this.statText.textContent = `${scoreMs} ms offset`;

            app.updateBestScore('speedtrap', scoreMs, true);
        } else {
            if (carCenter < this.zoneStart) {
                this.finishMisfire('TOO EARLY');
            } else {
                this.finishMisfire('TOO LATE');
            }
        }

        setTimeout(() => this.overlay.classList.remove('hidden'), 1000);
    },

    finishMisfire(reason) {
        this.state = 'finished';
        cancelAnimationFrame(this.animationId);
        sounds.penaltyThud();
        this.title.textContent = reason;
        this.title.style.color = 'var(--accent-red)';
        this.statText.textContent = 'Missed Trap';
        setTimeout(() => this.overlay.classList.remove('hidden'), 1000);
    }
};

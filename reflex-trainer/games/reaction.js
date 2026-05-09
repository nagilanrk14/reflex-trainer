/**
 * Reaction Time Game Logic
 */
const reactionGame = {
    state: 'idle', // idle, waiting, ready, finished
    timeoutId: null,
    startTime: 0,
    area: document.getElementById('reaction-area'),
    title: document.getElementById('reaction-title'),
    desc: document.getElementById('reaction-desc'),
    icon: document.getElementById('reaction-icon'),
    lightsContainer: document.getElementById('start-lights-container'),
    lights: document.querySelectorAll('.light'),
    
    // CPSS elements
    mathContainer: document.getElementById('math-problem-container'),
    mathText: document.getElementById('math-problem-text'),
    mathInput: document.getElementById('math-answer-input'),
    mathToggle: document.getElementById('cpss-math-toggle'),
    audioToggle: document.getElementById('cpss-audio-toggle'),
    correctAnswer: null,
    mathFailed: false,

    init() {
        this.area.addEventListener('mousedown', (e) => {
            // Prevent triggering if clicking specifically on the math input box
            if (e.target === this.mathInput) return;
            this.handleClick();
        });
        this.reset();
    },

    reset() {
        this.state = 'idle';
        this.area.className = 'game-area';
        this.title.textContent = 'Click to Stage';
        this.desc.textContent = 'Wait for the lights to go out!';
        this.icon.textContent = '🚥';
        this.icon.style.display = 'block';
        this.lightsContainer.classList.add('hidden');
        if (this.mathContainer) this.mathContainer.classList.add('hidden');
        if (this.mathInput) this.mathInput.value = '';
        this.mathFailed = false;

        this.lights.forEach(light => {
            light.classList.remove('on');
            light.classList.add('off');
        });

        clearTimeout(this.timeoutId);
    },

    generateMathProblem() {
        const ops = ['+', '-'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a = Math.floor(Math.random() * 30) + 5;
        let b = Math.floor(Math.random() * 20) + 1;
        
        if (op === '-' && b > a) { 
            let temp = a; a = b; b = temp; 
        }
        
        this.correctAnswer = op === '+' ? a + b : a - b;
        this.mathText.textContent = `${a} ${op} ${b} = ?`;
        this.mathContainer.classList.remove('hidden');
        this.mathInput.value = '';
        
        // Timeout to focus input so it doesn't instantly lose focus
        setTimeout(() => this.mathInput.focus(), 50);
    },

    handleClick() {
        if (this.state === 'idle' || this.state === 'finished') {
            this.startWaiting();
        } else if (this.state === 'waiting') {
            this.clickTooEarly();
        } else if (this.state === 'ready') {
            this.finish();
        }
    },

    startWaiting() {
        this.state = 'waiting';
        this.area.className = 'game-area'; 
        this.title.textContent = '';
        this.desc.textContent = '';
        this.icon.style.display = 'none';
        
        if (this.mathToggle && this.mathToggle.checked) {
            this.generateMathProblem();
        }

        if (this.audioToggle && this.audioToggle.checked) {
            // Audio only mode
            this.title.textContent = 'Listen for the tone...';
            this.lightsContainer.classList.add('hidden');
            const randomDelay = Math.random() * 3000 + 1500;
            this.timeoutId = setTimeout(() => this.turnGreen(), randomDelay);
            return;
        }

        // Standard Visual Light Sequence
        this.lightsContainer.classList.remove('hidden');
        if (typeof sounds !== 'undefined' && sounds.revEngine) sounds.revEngine();

        let lightIndex = 0;
        const lightUpNext = () => {
            if (this.state !== 'waiting') return;

            if (lightIndex < 5) {
                this.lights[lightIndex].classList.remove('off');
                this.lights[lightIndex].classList.add('on');
                if (typeof sounds !== 'undefined' && sounds.lightDown) sounds.lightDown();

                lightIndex++;
                this.timeoutId = setTimeout(lightUpNext, 1000);
            } else {
                const randomDelay = Math.random() * 2000 + 200;
                this.timeoutId = setTimeout(() => this.turnGreen(), randomDelay);
            }
        };

        this.timeoutId = setTimeout(lightUpNext, 500);
    },

    turnGreen() {
        this.state = 'ready';

        if (this.mathToggle && this.mathToggle.checked) {
            const userAnswer = parseInt(this.mathInput.value, 10);
            this.mathFailed = isNaN(userAnswer) || userAnswer !== this.correctAnswer;
        } else {
            this.mathFailed = false;
        }

        if (this.audioToggle && this.audioToggle.checked) {
            if (typeof sounds !== 'undefined' && sounds.goSignal) sounds.goSignal();
            // Optional: change color briefly or keep dark
        } else {
            this.lights.forEach(light => {
                light.classList.remove('on');
                light.classList.add('off');
            });
            if (typeof sounds !== 'undefined' && sounds.goSignal) sounds.goSignal();
        }
        
        this.startTime = performance.now();
    },

    clickTooEarly() {
        clearTimeout(this.timeoutId);
        this.state = 'finished';
        this.area.className = 'game-area penalty';
        
        this.lightsContainer.classList.add('hidden');
        if (this.mathContainer) this.mathContainer.classList.add('hidden');
        
        this.icon.style.display = 'block';
        this.title.textContent = 'Jump Start!';
        this.desc.textContent = 'Penalty applied. Click to retry.';
        this.icon.textContent = '🛑';

        if (typeof sounds !== 'undefined' && sounds.penaltyThud) sounds.penaltyThud();

        if (typeof app !== 'undefined' && app.triggerEngineerMessage) {
            app.triggerEngineerMessage("Jump start, mate. Drive through penalty.");
        }
    },

    finish() {
        const endTime = performance.now();
        let reactionTime = Math.round(endTime - this.startTime);

        this.state = 'finished';
        this.area.className = 'game-area';
        this.lightsContainer.classList.add('hidden');
        if (this.mathContainer) this.mathContainer.classList.add('hidden');
        
        this.icon.style.display = 'block';
        this.icon.textContent = '⏱️';
        this.desc.textContent = 'Click to try again.';

        if (this.mathFailed) {
            reactionTime += 500;
            this.title.innerHTML = `${reactionTime} ms <br><span style="font-size: 0.5em; color: var(--accent-fuchsia);">+500ms Math Penalty</span>`;
            if (typeof sounds !== 'undefined' && sounds.penaltyThud) sounds.penaltyThud();
            if (typeof app !== 'undefined' && app.triggerEngineerMessage) {
                app.triggerEngineerMessage("Incorrect calculation, +500ms penalty.");
            }
        } else {
            this.title.textContent = `${reactionTime} ms`;
        }

        if (typeof app !== 'undefined' && app.updateBestScore) {
            app.updateBestScore('reaction', reactionTime, true);
        }
    }
};

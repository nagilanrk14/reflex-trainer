/**
 * Main Application Logic
 */
const app = {
    scores: {
        reactionHistory: JSON.parse(localStorage.getItem('history-reaction')) || [],
        aimHistory: JSON.parse(localStorage.getItem('history-aim')) || [],
        speedtrapHistory: JSON.parse(localStorage.getItem('history-speedtrap')) || [],
        reactionBest: localStorage.getItem('best-reaction') || '-',
        aimBest: localStorage.getItem('best-aim') || '-',
        speedtrapBest: localStorage.getItem('best-speedtrap') || '-'
    },
    leaderboards: {
        reaction: JSON.parse(localStorage.getItem('lb-reaction')) || [],
        aim: JSON.parse(localStorage.getItem('lb-aim')) || [],
        speedtrap: JSON.parse(localStorage.getItem('lb-speedtrap')) || []
    },
    telemetryChart: null,
    rainEnabled: false,
    engineerTimeout: null,

    init() {
        this.updateDashboardStats();
        this.initChart();
        this.renderLeaderboards();

        // Modal Cancel Listener
        document.getElementById('initials-cancel').addEventListener('click', () => {
            document.getElementById('initials-modal').classList.add('hidden');
        });

        // Home button listener
        document.getElementById('home-btn').addEventListener('click', () => {
            this.loadView('view-dashboard');
        });

        // Rain Toggle Listener
        const rainBtn = document.getElementById('rain-toggle');
        if (rainBtn) {
            rainBtn.addEventListener('click', () => {
                this.rainEnabled = !this.rainEnabled;
                document.body.classList.toggle('rain-session', this.rainEnabled);
                rainBtn.textContent = this.rainEnabled ? 'SESSION: WET (INTERS)' : 'SESSION: DRY (SLICKS)';
                rainBtn.classList.toggle('wet');
            });
        }

        // Fatigue Report Listener
        const fatigueBtn = document.getElementById('fatigue-btn');
        if (fatigueBtn) {
            fatigueBtn.addEventListener('click', () => {
                this.generateFatigueReport();
            });
        }

        // Initialize games
        reactionGame.init();
        aimGame.init();
        if (typeof speedTrapGame !== 'undefined') speedTrapGame.init();
        if (typeof pitstopGame !== 'undefined') pitstopGame.init();

        this.calculateRank();
    },

    loadView(viewId) {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => {
            el.classList.remove('active');
        });

        // Show target view
        document.getElementById(viewId).classList.add('active');

        // Reset games when leaving their view
        if (viewId !== 'view-reaction') reactionGame.reset();
        if (viewId !== 'view-aim') aimGame.reset();
        if (viewId !== 'view-speedtrap' && typeof speedTrapGame !== 'undefined') speedTrapGame.reset();
        if (viewId !== 'view-pitstop' && typeof pitstopGame !== 'undefined') pitstopGame.reset();
    },

    updateBestScore(game, newScore, lowerIsBetter = true) {
        // Handle History Tracking
        const historyKey = `${game}History`;
        if (this.scores[historyKey]) {
            this.scores[historyKey].push({ score: newScore, timestamp: Date.now() });

            // Keep last 15 scores
            if (this.scores[historyKey].length > 15) {
                this.scores[historyKey].shift();
            }
            localStorage.setItem(`history-${game}`, JSON.stringify(this.scores[historyKey]));
        }

        // Handle Best Score
        const bestKey = `${game}Best`;
        const currentBest = this.scores[bestKey];
        let isNewBest = false;

        if (currentBest === '-') {
            isNewBest = true;
        } else {
            const currentObj = parseInt(currentBest);
            if (lowerIsBetter && newScore < currentObj) {
                isNewBest = true;
            } else if (!lowerIsBetter && newScore > currentObj) {
                isNewBest = true;
            }
        }

        if (isNewBest) {
            this.scores[bestKey] = newScore;
            localStorage.setItem(`best-${game}`, newScore);

            // Trigger Custom HTML Modal
            this.promptLeaderboard(game, newScore, lowerIsBetter);
        }

        this.updateDashboardStats();
        this.updateChart();
        this.calculateRank();
    },

    promptLeaderboard(game, newScore, lowerIsBetter) {
        const modal = document.getElementById('initials-modal');
        const input = document.getElementById('initials-input');
        const submitBtn = document.getElementById('initials-submit');
        const desc = document.getElementById('modal-desc');

        desc.textContent = `You set a new best time of ${newScore}ms for ${game.toUpperCase()}! Enter your 3 initials:`;
        input.value = '';
        modal.classList.remove('hidden');
        input.focus();

        // Clean up previous event listeners if any
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

        newSubmitBtn.addEventListener('click', async () => {
            const initials = input.value.trim().substring(0, 3).toUpperCase() || 'VER';
            const rank = document.getElementById('rank-text').textContent || 'UNRANKED';
            
            // Optimistically update local UI
            this.leaderboards[game] = this.leaderboards[game] || [];
            this.leaderboards[game].push({ initials, score: newScore, rank });
            this.leaderboards[game].sort((a, b) => {
                return lowerIsBetter ? a.score - b.score : b.score - a.score;
            });
            if (this.leaderboards[game].length > 5) {
                this.leaderboards[game] = this.leaderboards[game].slice(0, 5);
            }
            
                        // Insert into Supabase
            const { data, error } = await window.supabaseClient
                .from('leaderboards')
                .insert([
                    { game: game, initials: initials, score: newScore, rank: rank }
                ]);
           
                
            if (error) {
                console.error("Error saving to Supabase:", error);
            }

            await this.renderLeaderboards();
            modal.classList.add('hidden');
        });
    },

    async renderLeaderboards() {
        const createLbHtml = (arr) => {
            if (!arr || arr.length === 0) return '<li>No times posted yet</li>';
            return arr.map((entry, index) =>
                `<li><span class="lb-pos">P${index + 1}</span> <span class="lb-name" title="${entry.rank || ''}">${entry.initials}</span> <span class="lb-score">${entry.score}ms</span></li>`
            ).join('');
        };

        const games = ['reaction', 'aim', 'speedtrap', 'pitstop'];
        
        for (const game of games) {
            // Determine sort order (lower is better for all current minigames)
            const ascending = true;
            
                     try {
                const { data, error } = await window.supabaseClient
                    .from('leaderboards')
                    .select('*')
                    .eq('game', game)
                    .order('score', { ascending: ascending })
                    .limit(5);
                if (!error && data) {
                    this.leaderboards[game] = data;
                    const listEl = document.getElementById(`lb-${game}-list`);
                    if (listEl) {
                        listEl.innerHTML = createLbHtml(data);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch leaderboard for " + game, err);
            }
        }
    },

    updateDashboardStats() {
        document.getElementById('best-reaction').textContent = this.scores.reactionBest !== '-' ? this.scores.reactionBest : '-';
        document.getElementById('best-aim').textContent = this.scores.aimBest !== '-' ? this.scores.aimBest : '-';

        const stText = document.getElementById('best-speedtrap');
        if (stText) stText.textContent = this.scores.speedtrapBest !== '-' ? this.scores.speedtrapBest : '-';
    },

    initChart() {
        const ctx = document.getElementById('telemetryChart').getContext('2d');

        Chart.defaults.color = '#a0a0b0';
        Chart.defaults.font.family = "'Orbitron', sans-serif";

        this.telemetryChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: 15 }, (_, i) => i + 1),
                datasets: [
                    {
                        label: 'Grid Start (ms)',
                        data: this.padArray(this.scores.reactionHistory, 15),
                        borderColor: '#e10600', // F1 Red
                        backgroundColor: 'rgba(225, 6, 0, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        pointBackgroundColor: '#fff',
                        fill: true
                    },
                    {
                        label: 'Fly Swatter (ms)',
                        data: this.padArray(this.scores.aimHistory, 15),
                        borderColor: '#ffffff', // F1 White
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderWidth: 2,
                        tension: 0.3,
                        borderDash: [5, 5],
                        pointBackgroundColor: '#fff',
                        fill: true
                    },
                    {
                        label: 'Speed Trap (ms diff)',
                        data: this.padArray(this.scores.speedtrapHistory, 15),
                        borderColor: '#00ff00', // F1 Green
                        backgroundColor: 'rgba(0, 255, 0, 0.05)',
                        borderWidth: 2,
                        tension: 0.3,
                        borderDash: [2, 2],
                        pointBackgroundColor: '#fff',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },

    updateChart() {
        if (this.telemetryChart) {
            this.telemetryChart.data.datasets[0].data = this.padArray(this.scores.reactionHistory, 15);
            this.telemetryChart.data.datasets[1].data = this.padArray(this.scores.aimHistory, 15);
            this.telemetryChart.data.datasets[2].data = this.padArray(this.scores.speedtrapHistory, 15);
            this.telemetryChart.update();
        }
    },

    getScoresFromHistory(arr) {
        return arr.map(item => (typeof item === 'object' && item !== null) ? item.score : item);
    },

    padArray(arr, length) {
        const scores = this.getScoresFromHistory(arr);
        // Pad start so graph aligns nicely to the right
        if (scores.length < length) {
            const padding = new Array(length - scores.length).fill(null);
            return padding.concat(scores);
        }
        return scores;
    },

    generateFatigueReport() {
        const historyItems = this.scores.reactionHistory;
        if (historyItems.length < 5) {
            if (typeof this.triggerEngineerMessage !== 'undefined') {
                this.triggerEngineerMessage("Insufficient data for Fatigue Report.");
            }
            return;
        }

        // Filter out legacy simple numbers to get ones with timestamps
        const validItems = historyItems.filter(item => typeof item === 'object' && item !== null && item.timestamp);
        
        if (validItems.length < 4) {
            if (typeof this.triggerEngineerMessage !== 'undefined') {
                this.triggerEngineerMessage("Need more recent session data.");
            }
            return;
        }

        // Extremely simple calculation: compare first 2 valid items (representing early session)
        // versus the last 2 valid items (representing late session)
        const earlySum = validItems[0].score + validItems[1].score;
        const lateSum = validItems[validItems.length - 1].score + validItems[validItems.length - 2].score;
        
        const earlyAvg = earlySum / 2;
        const lateAvg = lateSum / 2;
        
        const changeMs = lateAvg - earlyAvg;
        let diffPercent = ((changeMs / earlyAvg) * 100).toFixed(1);
        
        // Let's create an artifact-like HTML popup using the Custom Initials Modal structure
        const modal = document.getElementById('initials-modal');
        const submitBtn = document.getElementById('initials-submit');
        const desc = document.getElementById('modal-desc');
        const input = document.getElementById('initials-input');
        
        modal.querySelector('h3').textContent = 'FATIGUE REPORT';
        input.style.display = 'none';
        
        let reportText = `Early Session Avg: ${Math.round(earlyAvg)}ms<br>Late Session Avg: ${Math.round(lateAvg)}ms<br><br>`;
        if (changeMs > 0) {
            reportText += `<strong style="color:red;">Fatigue detected. Responses slowed by ${diffPercent}%.</strong>`;
        } else if (changeMs < 0) {
            reportText += `<strong style="color:var(--accent-green);">No fatigue. Responses improved by ${Math.abs(diffPercent)}%.</strong>`;
        } else {
            reportText += `Consistent performance.`;
        }
        
        desc.innerHTML = reportText;
        modal.classList.remove('hidden');
        
        // Hide input cleanly, use the submit to close
        submitBtn.textContent = 'CLOSE REPORT';
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
        
        newSubmitBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            modal.querySelector('h3').textContent = 'NEW TRACK RECORD'; // reset state for next time
            input.style.display = 'inline-block';
            newSubmitBtn.textContent = 'SAVE RECORD';
        });
    },

    calculateRank() {
        const badge = document.getElementById('driver-rank-badge');
        const text = document.getElementById('rank-text');

        // Remove existing rank classes
        badge.classList.remove('unranked', 'rookie', 'contender', 'champion');

        const rb = this.scores.reactionBest;
        const ab = this.scores.aimBest;

        // Need at least one score to rank
        if (rb === '-' && ab === '-') {
            badge.classList.add('unranked');
            text.textContent = 'UNRANKED';
            return;
        }

        // Calculate a 'Rank Score' based on average times (lower is better)
        // Default to a bad time if one game hasn't been played
        const rTime = rb !== '-' ? parseInt(rb) : 1000;
        const aTime = ab !== '-' ? parseInt(ab) : 2000;

        // F1 Champion Thresholds (Elite): Reaction < 200ms AND Aim < 400ms
        if (rTime < 250 && aTime < 500) {
            badge.classList.add('champion');
            text.textContent = 'F1 CHAMPION';
        }
        // F2 Contender Thresholds: Reaction < 350ms AND Aim < 800ms
        else if (rTime < 350 && aTime < 800) {
            badge.classList.add('contender');
            text.textContent = 'F2 CONTENDER';
        }
        // Otherwise, Rookie
        else {
            badge.classList.add('rookie');
            text.textContent = 'F3 ROOKIE';
        }
    },

    triggerEngineerMessage(message) {
        const radio = document.getElementById('engineer-radio');
        const msgText = document.getElementById('engineer-msg');

        msgText.textContent = message;
        radio.classList.add('show');

        // Play radio beep sound
        if (typeof playSound !== 'undefined') playSound('radio');

        clearTimeout(this.engineerTimeout);
        this.engineerTimeout = setTimeout(() => {
            radio.classList.remove('show');
        }, 4000);
    }
};

// Start app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    app.init();
    
    // Backup: force video play on first interaction 
    // to bypass strict browser autoplay policies
    const video = document.getElementById('f1-bg-video');
    if (video) {
        document.body.addEventListener('click', () => {
            if (typeof video.play === 'function' && video.paused) {
                video.play().catch(e => console.log('Video autoplay blocked:', e));
            }
        }, { once: true });
    }
});

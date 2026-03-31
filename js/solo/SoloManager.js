class SoloManager {
    constructor(battleEngine) {
        this.battleEngine = battleEngine;
        this.socket = new SocketService();
        this.roomId = null;
        this.playerInfo = { name: "", id: null };
        this.opponentInfo = { name: "", id: null };
        this.matchStartTime = 0;
        this.selectionOptions = [];
        this.selectedPokemon = null;
        this.retryTimer = null;
        this.stamina = 0;
        this.myFighter = null;
        this.oppFighter = null;
        this.isMyTurn = false;
        this.isAnimating = false; // Guard for sequential execution

        this.initEvents();
        this.initSocketCallbacks();
    }

    resetState() {
        this.selectedPokemon = null;
        this.isAnimating = false;
        this.isMyTurn = false;
        this.myFighter = null;
        this.oppFighter = null;
        if (this.selectionTimer) clearInterval(this.selectionTimer);
        console.log("SoloManager state reset.");
    }

    startBattle(player, opponent) {
        this.myFighter = player;
        this.oppFighter = opponent;
        
        const myId = this.socket.id;
        this.battleEngine.startBattle(player, opponent, myId);
        
        // Set background AFTER startBattle to ensure it's not reset by internal calls
        this.battleEngine.forceBackground = 'bg_soccer';
        
        this.showScreen('pokesolo-battle-ui');
    }

    initEvents() {
        // Name Button
        document.getElementById('pokesolo-btn-start-match').addEventListener('click', () => this.startMatchmaking());
        
        // Cancel Matching
        document.getElementById('pokesolo-btn-cancel-match').addEventListener('click', () => this.cancelMatchmaking());

        // Back to Menu
        document.querySelectorAll('.btn-back-menu').forEach(btn => {
            btn.addEventListener('click', () => this.returnToMain());
        });

        // Result Buttons
        document.getElementById('pokesolo-btn-retry').addEventListener('click', () => this.retry());
        document.getElementById('pokesolo-btn-newgame').addEventListener('click', () => this.newGame());
    }

    initSocketCallbacks() {
        this.socket.on("connect", () => {
            console.log("SoloManager Socket Connected");
        });

        this.socket.on("match_found", (data) => {
            this.resetState(); // CRITICAL: Reset everything for the new match
            this.roomId = data.roomId;
            this.clearRetryTimer();
            const myId = this.socket.id;
            const opp = data.players.find(p => p.id !== myId);
            this.opponentInfo = opp;
            this.showScreen('pokesolo-selection-screen'); 
        });

        this.socket.on("selection_start", (data) => {
            this.selectionOptions = data.options;
            this.renderSelection(data.duration);
        });

        this.socket.on("battle_init", (data) => {
            this.startBattle(data.player, data.opponent);
        });

        this.socket.on("action_result_self", async (data) => {
            // Player just lunged, now show the impact on the opponent
            this.isAnimating = true;
            try {
                this.stamina = data.stamina;
                this.updateStaminaOnly();
                
                // Trigger impact on opponent side
                await this.battleEngine.executeRemoteImpact({
                    side: 'left', // I am the attacker
                    damage: data.damage,
                    heal: data.heal,
                    type: data.type,
                    hp: { [this.opponentInfo.id]: data.opponentHP, [this.socket.id]: this.myFighter.hp + (data.heal || 0) },
                    skillName: data.skillName,
                    skillId: data.skillId // Pass the ID from server
                });
                
                // Now sync local model
                if (this.myFighter) this.myFighter.hp += (data.heal || 0);
                if (this.oppFighter) this.oppFighter.hp = data.opponentHP;
                this.syncHPBars();
            } finally {
                this.isAnimating = false;
                this.checkPendingTurn();
            }
        });

        this.socket.on("action_result_opponent", async (data) => {
            // Opponent attacked. Play full sequence.
            this.isAnimating = true;
            try {
                await this.battleEngine.executeRemoteAction({
                    side: 'right', // Opponent is the attacker
                    damage: data.damage,
                    heal: data.heal,
                    type: data.type,
                    hp: { [this.socket.id]: data.remainingHP, [this.opponentInfo.id]: data.attackerHP },
                    skillName: data.skillName,
                    skillId: data.skillId
                });

                // Now sync local model
                if (this.myFighter) this.myFighter.hp = data.remainingHP;
                if (this.oppFighter) this.oppFighter.hp = data.attackerHP;
                this.syncHPBars();
            } finally {
                this.isAnimating = false;
                this.checkPendingTurn();
            }
        });

        this.socket.on("battle_end", (data) => {
            this.showResult(data);
        });

        this.socket.on("turn_start", (data) => {
            this.pendingTurnData = data;
            if (!this.isAnimating) {
                this.applyTurnStart();
            }
        });

        this.socket.on("request_action", () => {
            this.pendingRequestAction = true;
            if (!this.isAnimating) {
                this.applyRequestAction();
            }
        });

        this.socket.on("opponent_disconnected", () => {
            alert("対戦相手が切断されました。ルームを終了します。");
            this.handleUnexpectedDisconnect();
        });

        this.socket.on("timeout_disconnect", (data) => {
            alert(data.message || "30秒以内に選択されなかったため、接続が切断されました。");
            this.handleUnexpectedDisconnect();
        });

        this.socket.on("disconnect", () => {
            console.log("SoloManager Socket Disconnected");
            this.handleUnexpectedDisconnect();
        });

        this.socket.on("retry_declined", () => {
            document.getElementById('pokesolo-result-msg').textContent = "相手が退出しました。新しい相手を探します...";
            setTimeout(() => this.newGame(), 2000);
        });
    }

    handleUnexpectedDisconnect() {
        if (this.battleEngine) this.battleEngine.stop();
        this.clearRetryTimer();
        this.resetState();
        this.socket.disconnect(); // Ensure local socket state is closed
        this.returnToMain();
    }

    clearRetryTimer() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }

    boot() {
        this.showScreen('pokesolo-name-screen');
        
        // Use SVG for 100% reliability (no external files needed)
        const getBallSVG = (type) => {
            let colorTop = "#e63946", colorSpec = "";
            let extra = "";
            if (type === 'great') { 
                colorTop = "#4cc9f0"; 
                extra = `<path d="M25 15 L35 5 M65 5 L75 15" stroke="#e63946" stroke-width="6" fill="none"/>`;
            } else if (type === 'ultra') {
                colorTop = "#333";
                extra = `<path d="M20 20 L35 10 M65 10 L80 20" stroke="#ffd700" stroke-width="8" fill="none"/>`;
            } else if (type === 'master') {
                colorTop = "#a33ea1";
                extra = `<circle cx="35" cy="30" r="8" fill="#e63946"/><circle cx="65" cy="30" r="8" fill="#e63946"/><text x="50" y="42" font-family="Arial" font-size="24" font-weight="bold" fill="white" text-anchor="middle">M</text>`;
            }

            return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id="grad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                        <stop offset="0%" style="stop-color:white;stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:black;stop-opacity:0.2" />
                    </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="48" fill="white" stroke="#000" stroke-width="2"/>
                <path d="M2 50 a48 48 0 0 1 96 0 Z" fill="${colorTop}"/>
                ${extra}
                <rect x="2" y="47" width="96" height="6" fill="#000"/>
                <circle cx="50" cy="50" r="12" fill="#000"/>
                <circle cx="50" cy="50" r="8" fill="white" stroke="#000" stroke-width="1"/>
                <circle cx="50" cy="50" r="48" fill="url(#grad)" pointer-events="none"/>
            </svg>`;
        };

        const types = ['poke', 'great', 'ultra', 'master'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const svg = getBallSVG(randomType);
        const encoded = encodeURIComponent(svg);
        const ballBgEl = document.getElementById('pokesolo-name-ball-bg');
        if (ballBgEl) {
            ballBgEl.style.backgroundImage = `url("data:image/svg+xml,${encoded}")`;
        }

        // Retrieve name if stored
        const storedName = localStorage.getItem('pokesolo_name');
        if (storedName) {
            document.getElementById('pokesolo-input-name').value = storedName;
        }
    }

    startMatchmaking() {
        const name = document.getElementById('pokesolo-input-name').value.trim();
        if (!name) return alert("なまえを入力してください！");
        
        this.playerInfo.name = name;
        localStorage.setItem('pokesolo_name', name);

        // Connect if not already
        this.socket.connect(); // Add your server URL here if not localhost
        this.socket.emit("set_name", name);
        this.socket.emit("find_match");

        this.showScreen('pokesolo-matching-screen');
        this.startMatchingTimer();
    }

    cancelMatchmaking() {
        this.socket.disconnect();
        this.showScreen('pokesolo-name-screen');
    }

    startMatchingTimer() {
        this.matchStartTime = Date.now();
        const display = document.getElementById('pokesolo-match-timer');
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.matchStartTime) / 1000);
            
            // Format as mm:ss (Count-up style)
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toString().padStart(2, '0');
            display.textContent = `${mins}:${secs}`;

            // Safety cleanup (stop if screen changed or excessively long wait)
            if (elapsed > 60 || !document.getElementById('pokesolo-matching-screen').classList.contains('active')) {
                clearInterval(interval);
            }
        }, 1000);
    }

    async renderSelection(duration) {
        this.selectedPokemon = null; // CRITICAL: Reset state on every selection screen show
        if (this.selectionTimer) clearInterval(this.selectionTimer);
        
        this.showScreen('pokesolo-selection-screen');
        const container = document.getElementById('pokesolo-pokemon-list');
        container.innerHTML = '読み込み中...';

        const timerEl = document.getElementById('selection-timer');
        if (timerEl) {
            timerEl.textContent = duration;
            timerEl.style.fontSize = ""; // Reset to default
            timerEl.style.color = "";    // Reset to default
        }
        
        let timeLeft = duration;
        this.selectionTimer = setInterval(() => {
            timeLeft--;
            if (timerEl) timerEl.textContent = timeLeft;
            if (timeLeft <= 0) clearInterval(this.selectionTimer);
        }, 1000);

        // Map options to real instances for selection display
        const instances = await Promise.all(this.selectionOptions.map(opt => 
            GameData.buildFighterInstance(opt.id, opt.rarity)
        ));

        container.innerHTML = '';
        instances.forEach((p, i) => {
            const card = document.createElement('div');
            card.className = 'pokemon-card';
            card.innerHTML = `
                <div class="p-img"><img src="${p.uiSpriteUrl || ''}" alt=""></div>
                <div class="p-name">${p.name}</div>
                <div class="p-rarity" style="color: ${GameData.rarity[p.rarity].color || '#fff'}">${GameData.rarity[p.rarity].name}</div>
            `;
            card.addEventListener('click', () => this.selectPokemon(p, card));
            container.appendChild(card);
        });
    }

    selectPokemon(pokemon, card) {
        if (this.selectedPokemon) return; // Only one select
        this.selectedPokemon = pokemon;
        
        // UI Feedback: Stop timer and show READY!
        if (this.selectionTimer) {
            clearInterval(this.selectionTimer);
            this.selectionTimer = null;
        }

        const timerEl = document.getElementById('selection-timer');
        if (timerEl) {
            timerEl.textContent = "READY!!";
            timerEl.style.fontSize = "2.5rem"; // Make it prominent
            timerEl.style.color = "#06d6a0"; // Vibrant green color
        }

        // Highlight selected card
        document.querySelectorAll('.pokemon-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // Emit to server (sending full stats for sync)
        const pokemonData = {
            id: pokemon.id,
            name: pokemon.name,
            maxHp: pokemon.maxHp,
            atk: pokemon.atk,
            def: pokemon.def,
            spd: pokemon.spd,
            stamina: pokemon.stamina || 50, // STEP 2: Send base stamina stat
            spriteKey: pokemon.spriteKey,
            uiSpriteUrl: pokemon.uiSpriteUrl,
            types: pokemon.types,
            skills: pokemon.skills.reduce((acc, s) => { acc[s.id] = s; return acc; }, {})
        };

        this.socket.emit("select_pokemon", { playerId: this.socket.id, pokemonName: pokemon.name, roomId: this.roomId, pokemonData });
    }

    async startBattle(player, opponent) {
        UIUtils.showScreen('pokesolo-battle-ui');
        document.getElementById('battle-sprite-layer').style.display = 'block';

        if (this.battleEngine.resize) this.battleEngine.resize();
        this.battleEngine.forceBackground = null; // Clear any forced background when returning to selection

        const myId = this.socket.id;
        
        // Ensure we use Pokemon class instances for methods and default properties (like rarity)
        this.myFighter = new Pokemon(player.id, player.name, player.hp, player.atk, player.def, player.spd, player.spriteKey, player.types);
        this.myFighter.maxHp = player.maxHp || player.hp;
        this.myFighter.hp = player.hp;
        
        // --- ALWAYS FETCH LATEST GIF FOR POKEAPI SPRITES ---
        if (player.spriteKey && player.spriteKey.startsWith('api_')) {
            console.log("[SoloManager] API Poke detected, fetching GIF...");
            const fd = await GameData.fetchFighterData(player.id);
            this.myFighter.uiSpriteUrl = fd.uiSpriteUrl;
        } else {
            this.myFighter.uiSpriteUrl = player.uiSpriteUrl || "";
        }
        this.myFighter.skills = player.skills;

        this.oppFighter = new Pokemon(opponent.id, opponent.name, opponent.hp, opponent.atk, opponent.def, opponent.spd, opponent.spriteKey, opponent.types);
        this.oppFighter.maxHp = opponent.maxHp || opponent.hp;
        this.oppFighter.hp = opponent.hp;

        // --- ALWAYS FETCH LATEST GIF FOR POKEAPI SPRITES ---
        if (opponent.spriteKey && opponent.spriteKey.startsWith('api_')) {
            console.log("[SoloManager] API Poke detected, fetching GIF...");
            const fd = await GameData.fetchFighterData(opponent.id);
            this.oppFighter.uiSpriteUrl = fd.uiSpriteUrl;
        } else {
            this.oppFighter.uiSpriteUrl = opponent.uiSpriteUrl || "";
        }
        this.oppFighter.skills = opponent.skills;

        this.opponentInfo = { id: opponent.id, name: opponent.name };

        // Update initial UI
        document.getElementById('pokesolo-name-left').textContent = this.myFighter.name;
        document.getElementById('pokesolo-name-right').textContent = this.oppFighter.name;
        
        // Sync HP/SP
        this.updateBattleUI({ [myId]: player, [opponent.id]: opponent });

        // Setup Skills
        this.setupSkillButtons();

        // Setup BattleEngine
        this.battleEngine.startRemoteBattle(this.myFighter, this.oppFighter, {
            onHpChange: (side, hp, max) => {
                const fillEl = document.getElementById(side === 'left' ? 'pokesolo-hp-fill-left' : 'pokesolo-hp-fill-right');
                const textEl = document.getElementById(side === 'left' ? 'pokesolo-hp-text-left' : 'pokesolo-hp-text-right');
                if (fillEl) fillEl.style.width = `${(hp / max) * 100}%`;
                if (textEl) textEl.textContent = `${Math.ceil(hp)}/${max}`;
            },
            onEnd: () => {}
        });
    }

    updateBattleUI(fightersMap) {
        const myId = this.socket.id;
        const myData = fightersMap[myId];
        const oppId = Object.keys(fightersMap).find(id => id !== myId);
        const oppData = fightersMap[oppId];
        
        if (myData && this.myFighter) {
            this.myFighter.hp = myData.hp;
            this.myFighter.maxHp = myData.maxHp;
            this.myFighter.stamina = myData.stamina;
            this.stamina = myData.stamina;
        }

        if (oppData && this.oppFighter) {
            this.oppFighter.hp = oppData.hp;
            this.oppFighter.maxHp = oppData.maxHp;
            this.oppFighter.stamina = oppData.stamina;
        }

        // Update HP Bars
        const hpL = document.getElementById('pokesolo-hp-fill-left');
        const hpR = document.getElementById('pokesolo-hp-fill-right');
        const hpTxtL = document.getElementById('pokesolo-hp-text-left');
        const hpTxtR = document.getElementById('pokesolo-hp-text-right');
        
        hpL.style.width = `${(this.myFighter.hp / this.myFighter.maxHp) * 100}%`;
        hpR.style.width = `${(this.oppFighter.hp / this.oppFighter.maxHp) * 100}%`;
        hpTxtL.textContent = `${Math.ceil(this.myFighter.hp)}/${this.myFighter.maxHp}`;
        hpTxtR.textContent = `${Math.ceil(this.oppFighter.hp)}/${this.oppFighter.maxHp}`;

        // Update Stamina Bar
        const spFill = document.getElementById('pokesolo-stamina-fill');
        const spTxt = document.getElementById('pokesolo-stamina-text');
        const perc = (this.stamina / 100) * 100;
        spFill.style.width = `${perc}%`;
        spTxt.textContent = `${Math.round(this.stamina)}/100`;

        // Color shift for SP
        const color = perc > 50 ? '#ffd700' : (perc > 25 ? '#fca311' : '#e63946');
        spFill.style.background = color;
    }

    setupSkillButtons() {
        const container = document.getElementById('pokesolo-skill-container');
        container.innerHTML = '';
        
        // Convert skills map back to array if needed
        const skillsArr = Object.values(this.myFighter.skills);

        skillsArr.forEach(s => {
            const cost = this.getStaminaCost(s);
            const btn = document.createElement('button');
            btn.className = 'skill-btn';
            btn.dataset.skillId = s.id;
            btn.dataset.cost = cost;
            btn.innerHTML = `<div class="skill-name">${s.name}</div><div class="skill-cost">SP:${cost}</div>`;
            btn.style.backgroundColor = s.color || '#4a4e69';
            btn.disabled = true; // Disabled initially until request_action
            
            btn.addEventListener('click', () => {
                if (!this.isMyTurn || this.isAnimating) return;
                
                // --- IMMEDIATE LOCAL FEEDBACK ---
                this.isAnimating = true;
                this.battleEngine.executeLocalLunge('left', s.name, s.id);
                
                this.enableSkills(false);
                
                // Emit action to server
                this.socket.emit("use_skill", { 
                    playerId: this.socket.id,
                    skillName: s.name,
                    skillId: s.id, // kept for server logic
                    roomId: this.roomId 
                });
            });
            container.appendChild(btn);
        });
    }

    checkPendingTurn() {
        if (this.pendingTurnData) {
            this.applyTurnStart();
        }
        if (this.pendingRequestAction) {
            this.applyRequestAction();
        }
    }

    applyTurnStart() {
        if (!this.pendingTurnData) return;
        const data = this.pendingTurnData;
        this.pendingTurnData = null;

        this.isMyTurn = (data.currentTurnPlayerId === this.socket.id);
        this.updateBattleUI(data.fighters);
        this.updateSkillButtons();
    }

    applyRequestAction() {
        this.pendingRequestAction = false;
        this.enableSkills(true);
        document.getElementById('pokesolo-battle-message').textContent = "技を選んでください！";
    }

    syncHPBars() {
        if (!this.myFighter || !this.oppFighter) return;
        
        const sideL = 'left', sideR = 'right';
        const fillL = document.getElementById('pokesolo-hp-fill-left');
        const fillR = document.getElementById('pokesolo-hp-fill-right');
        const txtL = document.getElementById('pokesolo-hp-text-left');
        const txtR = document.getElementById('pokesolo-hp-text-right');

        fillL.style.width = `${(this.myFighter.hp / this.myFighter.maxHp) * 100}%`;
        fillR.style.width = `${(this.oppFighter.hp / this.oppFighter.maxHp) * 100}%`;
        txtL.textContent = `${Math.ceil(this.myFighter.hp)}/${this.myFighter.maxHp}`;
        txtR.textContent = `${Math.ceil(this.oppFighter.hp)}/${this.oppFighter.maxHp}`;
    }

    getStaminaCost(skill) {
        if (skill.type === 'attack') return Math.round(skill.power * 0.3);
        return 10;
    }

    updateSkillButtons() {
        document.querySelectorAll('#pokesolo-skill-container .skill-btn').forEach(btn => {
            const cost = parseInt(btn.dataset.cost);
            btn.disabled = !this.isMyTurn || (this.stamina < cost);
        });
    }

    enableSkills(enable) {
        document.querySelectorAll('#pokesolo-skill-container .skill-btn').forEach(btn => {
            const cost = parseInt(btn.dataset.cost);
            btn.disabled = !enable || (this.stamina < cost);
        });
    }

    updateStaminaOnly() {
        const spFill = document.getElementById('pokesolo-stamina-fill');
        const spTxt = document.getElementById('pokesolo-stamina-text');
        const perc = (this.stamina / 100) * 100;
        spFill.style.width = `${perc}%`;
        spTxt.textContent = `${Math.round(this.stamina)}/100`;
    }

    showResult(data) {
        this.battleEngine.stop();
        UIUtils.showScreen('pokesolo-result-screen');
        
        const isWin = data.winnerId === this.socket.id;
        document.getElementById('pokesolo-result-title').textContent = isWin ? "Victory!" : "Defeated...";
        document.getElementById('pokesolo-result-title').style.color = isWin ? "#ffd700" : "#e63946";
        const resultMsg = isWin ? 
            `${data.winnerPokemonName} の勝利！ おめでとう～！` : 
            `${data.winnerPokemonName} の勝利！ 次は頑張りましょう！`;
        document.getElementById('pokesolo-result-msg').textContent = resultMsg;
        const winnerImg = document.getElementById('pokesolo-winner-img');
        if (winnerImg && data.winnerSprite) {
            winnerImg.src = data.winnerSprite;
        }
        
        // Re-reset selection
        this.selectedPokemon = null;
    }

    retry() {
        this.socket.emit("retry_decision", { roomId: this.roomId, accept: true });
        document.getElementById('pokesolo-result-msg').textContent = "相手の返答を待っています... (15秒後に自動的に新規検索します)";
        
        this.clearRetryTimer();
        this.retryTimer = setTimeout(() => {
            console.log("Retry timeout reached, searching new game...");
            this.newGame();
        }, 15000);
    }

    newGame() {
        this.clearRetryTimer();
        this.socket.emit("retry_decision", { roomId: this.roomId, accept: false });
        this.startMatchmaking();
    }

    returnToMain() {
        if (this.battleEngine) {
            this.battleEngine.stop();
            this.battleEngine.forceBackground = null;
        }
        this.clearRetryTimer();
        this.socket.disconnect();
        UIUtils.showScreen('game-selection-screen');
    }

    showScreen(screenId) {
        UIUtils.showScreen(screenId);
    }
}

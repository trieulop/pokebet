const STAMINA_MAX = 100;
const STAMINA_INIT = 50;

class TrainUIController {
    constructor(battleEngine) {
        this.engine = battleEngine;
        this.playerFighter = null;
        this.enemyFighter = null;
        this.stamina = STAMINA_INIT;
        this.isLastMatchWin = false;
        this.statDeltaMult = 1.0;
        this.consecutiveWins = 0; // New: for final stage clear
        this.totalWins = 0;       // New: for evolution milestones
        this.isTransitioning = false; // New: prevent double clicks
        
        this.els = {
            prepScreen:     document.getElementById('train-prep-screen'),
            cardsContainer: document.getElementById('train-candidate-cards'),
            battleUi:       document.getElementById('train-battle-ui'),
            resultOverlay:  document.getElementById('train-result-overlay'),
            
            battleNameL:  document.getElementById('train-name-left'),
            battleHpTxtL: document.getElementById('train-hp-text-left'),
            battleFillL:  document.getElementById('train-hp-fill-left'),
            
            battleNameR:  document.getElementById('train-name-right'),
            battleHpTxtR: document.getElementById('train-hp-text-right'),
            battleFillR:  document.getElementById('train-hp-fill-right'),
            
            battleMsg:        document.getElementById('train-battle-message'),
            skillContainer:   document.getElementById('train-skill-container'),
            staminaFill:      document.getElementById('train-stamina-fill'),
            staminaText:      document.getElementById('train-stamina-text'),
            
            resTitle:    document.getElementById('train-result-title'),
            resSub:      document.getElementById('train-result-sub'),
            resName:     document.getElementById('train-res-name'),
            resHp:       document.getElementById('train-res-hp'),
            resAtk:      document.getElementById('train-res-atk'),
            resDef:      document.getElementById('train-res-def'),
            resSpd:      document.getElementById('train-res-spd'),
            resSprite:   document.getElementById('train-res-sprite'),
            resInstruction: document.getElementById('train-res-instruction'),
            statPicker:     document.getElementById('train-stat-picker'),
            clearBox:       document.getElementById('train-clear-box'),
            defeatBox:      document.getElementById('train-defeat-box'),
            btnRestart:     document.getElementById('train-btn-restart'),
            btnReselect:    document.getElementById('train-btn-reselect'),
            btnBack:        document.getElementById('train-btn-back'),
            
            loadingText: document.getElementById('train-loading-text')
        };
        
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('train-btn-hp').addEventListener('click',  () => this.applyStatChange('maxHp'));
        document.getElementById('train-btn-atk').addEventListener('click', () => this.applyStatChange('atk'));
        document.getElementById('train-btn-def').addEventListener('click', () => this.applyStatChange('def'));
        document.getElementById('train-btn-spd').addEventListener('click', () => this.applyStatChange('spd'));
        this.els.btnRestart.addEventListener('click', () => location.reload());
        this.els.btnReselect.addEventListener('click', () => {
            this.totalWins = 0;
            this.consecutiveWins = 0;
            this.boot();
        });
        this.els.btnBack.addEventListener('click', () => {
            this.hideAll();
            document.getElementById('game-selection-screen').classList.add('active');
        });
    }

    hideAll() {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    }

    // ---------- STAMINA HELPERS ----------
    getStaminaCost(skill) {
        // Higher power = higher cost. 
        if (skill.type === 'attack') {
            return Math.round(skill.power * 0.3); // e.g. tackle(40)=12, hydropump(110)=33
        }
        // Recover (自己再生) and Protect (まもる) are 10 SP
        return 10;
    }

    refundTurnStamina() {
        // Each turn the player regenerates 15 stamina
        this.stamina = Math.min(STAMINA_MAX, this.stamina + 15);
        this.updateStaminaBar();
    }

    updateStaminaBar() {
        let perc = (this.stamina / STAMINA_MAX) * 100;
        this.els.staminaFill.style.width = `${perc}%`;
        // Color shift: green -> yellow -> red
        let color = perc > 50 ? '#ffd700' : (perc > 25 ? '#fca311' : '#e63946');
        this.els.staminaFill.style.background = color;
        this.els.staminaText.innerText = `${Math.round(this.stamina)}/${STAMINA_MAX}`;
        
        // Disable buttons if not enough stamina
        document.querySelectorAll('.skill-btn').forEach(btn => {
            let cost = Number(btn.dataset.cost || 0);
            btn.disabled = cost > this.stamina;
        });
    }

    // ---------- BOOT (Preparation) ----------
    async boot() {
        this.hideAll();
        this.els.prepScreen.classList.add('active');
        this.els.loadingText.style.display = 'block';
        this.els.cardsContainer.innerHTML = '';
        
        let candidates = await PokemonService.getFourCandidates();
        this.els.loadingText.style.display = 'none';
        
        candidates.forEach(f => {
            let card = document.createElement('div');
            card.className = 'fighter-card train-card';
            let tIcon = getTypeIconHTML(f.types[0]);
            
            card.innerHTML = `
                <div class="name-box"><span class="name">${tIcon} ${f.name}</span></div>
                <div class="card-content">
                    <div class="stats-box">
                        <div>HP: ${f.maxHp}</div>
                        <div>ATK: ${f.atk}</div>
                        <div>DEF: ${f.def}</div>
                        <div>SPD: ${f.spd}</div>
                    </div>
                    <img class="card-sprite" src="${f.uiSpriteUrl}">
                </div>
                <button class="btn btn-bet train-btn-select">これを選ぶ</button>
            `;
            
            card.querySelector('.train-btn-select').addEventListener('click', () => {
                this.playerFighter = f;
                this.stamina = STAMINA_INIT;
                this.startMatch();
            });
            
            this.els.cardsContainer.appendChild(card);
        });
    }

    // ---------- BATTLE ----------
    async startMatch() {
        this.hideAll();
        this.els.battleUi.classList.add('active');
        this.stamina = STAMINA_INIT;
        this.updateStaminaBar();
        
        this.els.battleMsg.innerText = '野生のポケモンを探しています...';
        this.enemyFighter = await PokemonService.generateEnemy(this.playerFighter);
        
        this.els.battleNameL.innerText = this.playerFighter.name;
        this.els.battleNameR.innerText = this.enemyFighter.name;
        
        this.setupSkillButtons();
        
        this.engine.battleMode = 'manual';
        this.engine.forceBackground = 'bg_train';
        
        this.engine.startBattle(this.playerFighter, this.enemyFighter, {
            onMessage: (msg) => { this.els.battleMsg.innerText = msg; },
            onHpChange: (side, current, max) => {
                let perc = Math.max(0, (current / max) * 100);
                let txt  = side === 'left' ? this.els.battleHpTxtL : this.els.battleHpTxtR;
                let fill = side === 'left' ? this.els.battleFillL  : this.els.battleFillR;
                txt.innerText = `${current}/${max}`;
                fill.style.width = `${perc}%`;
                fill.style.backgroundColor = perc > 50 ? '#4cc9f0' : (perc > 20 ? '#fca311' : '#e63946');
            },
            onEnd: (winnerSide) => {
                this.handleResult(winnerSide);
            }
        });
    }

    setupSkillButtons() {
        this.els.skillContainer.innerHTML = '';
        this.playerFighter.skills.forEach(s => {
            let cost = this.getStaminaCost(s);
            let btn = document.createElement('button');
            btn.className = 'skill-btn';
            btn.dataset.cost = cost;
            btn.innerHTML = `${s.name}<br><small style="opacity:0.8;font-size:8px;">SP:${cost}</small>`;
            btn.style.backgroundColor = s.color && s.color !== '#fff' ? s.color : '#4a4e69';
            btn.addEventListener('click', () => {
                if (!this.engine.resolvePlayerInput) return;
                if (this.stamina < cost) return; // double-check
                
                // Deduct stamina
                this.stamina = Math.max(0, this.stamina - cost);
                this.updateStaminaBar();
                
                this.engine.resolvePlayerInput(s);
                this.engine.resolvePlayerInput = null;
                
                // Regen next turn (after 1 full turn cycle completes)
                setTimeout(() => {
                    this.refundTurnStamina();
                }, 2000); // approximate timing for one turn
            });
            this.els.skillContainer.appendChild(btn);
        });
    }

    // ---------- RESULT ----------
    handleResult(winnerSide) {
        let isWin = winnerSide === 'left';
        this.isLastMatchWin = isWin;
        
        if (isWin) {
            AudioSystem.playVictoryMusic();
            this.totalWins++;
            this.consecutiveWins++;
            
            this.els.resTitle.innerText = '勝利！';
            this.els.resTitle.style.color = '#06d6a0';
            this.els.resSub.innerText = 'ステータスを1つ選んで 10% 強化！';
            this.els.resInstruction.innerText = '1つ選んで強化！';
            this.statDeltaMult = 1.1;

            // --- GAME CLEAR CHECK ---
            if (this.playerFighter.isFinalEvolution && this.consecutiveWins >= 3) {
                this.els.resTitle.innerText = '🏆 全制覇 🏆';
                this.els.resTitle.style.color = '#ffd700';
                this.els.resSub.innerText = '伝説のトレーナーの称号を手に入れました！';
                this.els.resInstruction.innerText = 'おめでとう！最強の相棒と共に頂点へ！';
                
                this.els.statPicker.classList.add('hidden');
                this.els.clearBox.classList.remove('hidden');
            } else {
                this.els.statPicker.classList.remove('hidden');
                this.els.clearBox.classList.add('hidden');
            }
            this.els.defeatBox.classList.add('hidden');
        } else {
            AudioSystem.playDefeatMusic();
            this.consecutiveWins = 0; // Reset on loss
            
            this.els.resTitle.innerText = '敗北...';
            this.els.resTitle.style.color = '#e63946';
            this.els.resSub.innerText = 'ステータスを1つ選んで 5% 減少...';
            this.els.resInstruction.innerText = '1つ選んで...(弱体化)';
            this.statDeltaMult = 0.95;

            this.els.statPicker.classList.remove('hidden');
            this.els.clearBox.classList.add('hidden');
            this.els.defeatBox.classList.remove('hidden');
        }
        
        // Populate the pokemon card
        this.els.resName.innerText   = this.playerFighter.name;
        this.els.resHp.innerText     = this.playerFighter.maxHp;
        this.els.resAtk.innerText    = this.playerFighter.atk;
        this.els.resDef.innerText    = this.playerFighter.def;
        this.els.resSpd.innerText    = this.playerFighter.spd;
        this.els.resSprite.src       = this.playerFighter.uiSpriteUrl;
        
        this.hideAll();
        this.els.resultOverlay.classList.add('active');
    }

    async applyStatChange(statName) {
        if (this.isTransitioning) return; // Prevent double clicks
        
        // Apply multiplier
        this.playerFighter[statName] = Math.floor(this.playerFighter[statName] * this.statDeltaMult);
        if (statName === 'maxHp') {
            this.playerFighter.hp = this.playerFighter.maxHp;
        }
        this.playerFighter.hp = this.playerFighter.maxHp; // heal for next fight

        // Check Evolution milestone (every 3 total wins)
        let prevId = this.playerFighter.id;
        this.playerFighter.winCount = this.totalWins; // Sync
        this.playerFighter = await EvolutionService.handleEvolution(this.playerFighter);
        
        // Show progression messages
        if (prevId !== this.playerFighter.id) {
            this.isTransitioning = true;
            // --- New: Visual Evolution Sequence ---
            this.els.resSprite.classList.add('evolving');
            
            // Wait for 2s while it "pulses"
            setTimeout(() => {
                this.els.resSprite.classList.remove('evolving');
                
                // Update UI to show the new evolved form
                this.els.resName.innerText   = this.playerFighter.name;
                this.els.resHp.innerText     = this.playerFighter.maxHp;
                this.els.resAtk.innerText    = this.playerFighter.atk;
                this.els.resDef.innerText    = this.playerFighter.def;
                this.els.resSpd.innerText    = this.playerFighter.spd;
                this.els.resSprite.src       = this.playerFighter.uiSpriteUrl;
                
                // Pop effect!
                this.els.resSprite.classList.add('evolved-pop');
                setTimeout(() => {
                    this.els.resSprite.classList.remove('evolved-pop');
                    
                    // --- Notification at the moment of evolution ---
                    if (this.playerFighter.isFinalEvolution) {
                        alert('最終形態到達！\nここからは 3連勝 でゲームクリアだ！');
                    } else {
                        alert('おめでとう！進化成功！\n次のステージまで 通算3勝 を目指して！');
                    }

                    this.isTransitioning = false;
                    this.startMatch(); // Continue AFTER evolution finishes
                }, 600);
            }, 2000);

            this.consecutiveWins = 0; 
        } else {
            // No evolution, proceed immediately to next battle
            this.startMatch();
        }
    }
}

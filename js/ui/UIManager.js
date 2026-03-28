const TypeColors = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
    steel: '#B7B7CE', fairy: '#D685AD'
};

function getTypeIconHTML(type) {
    let safeType = type.toLowerCase();
    let color = TypeColors[safeType] || '#A8A77A';
    let url = `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${safeType}.svg`;
    return `<img src="${url}" style="width:20px;height:20px;border-radius:50%;background-color:${color};margin-right:4px;vertical-align:middle;box-shadow: 0 0 4px rgba(0,0,0,0.5); object-fit: contain; padding: 2px; box-sizing: border-box;" alt="${safeType}">`;
}

class UIManager {
    constructor(battleEngine) {
        this.battleEngine = battleEngine;
        this.points = 1000;
        this.upgradeLevel = 0; // 0 to max, determines bonusMultiplier

        this.leftFighter = null;
        this.rightFighter = null;
        this.betSide = null; // 'left' or 'right'
        this.upgradeNextBet = false;
        
        // DOM Elements
        this.els = {
            points: document.getElementById('player-points'),
            betScreen: document.getElementById('betting-screen'),
            battleUi: document.getElementById('battle-ui'),
            resultScreen: document.getElementById('result-screen'),
            upgradeScreen: document.getElementById('upgrade-screen'),
            
            // Left Card
            leftName: document.querySelector('#fighter-left .name'),
            leftStatsHp: document.querySelector('#fighter-left .hp'),
            leftStatsAtk: document.querySelector('#fighter-left .atk'),
            leftStatsDef: document.querySelector('#fighter-left .def'),
            leftStatsSpd: document.querySelector('#fighter-left .spd'),
            leftProb: document.querySelector('#fighter-left .prob'),
            leftRarity: document.querySelector('#fighter-left .rarity-indicator'),
            leftSpriteImg: document.querySelector('#fighter-left .card-sprite'),
            
            // Right Card
            rightName: document.querySelector('#fighter-right .name'),
            rightStatsHp: document.querySelector('#fighter-right .hp'),
            rightStatsAtk: document.querySelector('#fighter-right .atk'),
            rightStatsDef: document.querySelector('#fighter-right .def'),
            rightStatsSpd: document.querySelector('#fighter-right .spd'),
            rightProb: document.querySelector('#fighter-right .prob'),
            rightRarity: document.querySelector('#fighter-right .rarity-indicator'),
            rightSpriteImg: document.querySelector('#fighter-right .card-sprite'),

            // Battle UI
            bNameL: document.getElementById('battle-name-left'),
            bHpTxtL: document.getElementById('battle-hp-text-left'),
            bFillL: document.getElementById('hp-fill-left'),
            
            bNameR: document.getElementById('battle-name-right'),
            bHpTxtR: document.getElementById('battle-hp-text-right'),
            bFillR: document.getElementById('hp-fill-right'),

            bMsg: document.getElementById('battle-message'),
            
            // Result UI
            resTitle: document.getElementById('result-title'),
            resPoints: document.getElementById('result-points'),
            
            // Global Upgrade Toggle
            btnGlobalUpgrade: document.getElementById('btn-global-upgrade'),
            nextMatchBtn: document.getElementById('btn-next-match'),
            btnBack: document.getElementById('bet-btn-back')
        };

        this.initEvents();
        this.loadSave();
        this.updatePointsDisplay();
    }

    initEvents() {
        this.els.nextMatchBtn.addEventListener('click', () => {
            this.els.resultScreen.classList.add('hidden');
            this.generateMatchup();
        });

        this.els.btnBack.addEventListener('click', () => {
            this.els.betScreen.classList.remove('active');
            document.getElementById('top-bar').classList.add('hidden');
            document.getElementById('game-selection-screen').classList.add('active');
        });

        this.els.btnGlobalUpgrade.addEventListener('click', () => {
            if (this.upgradeNextBet) {
                // Turn off
                this.upgradeNextBet = false;
                this.els.btnGlobalUpgrade.classList.remove('active-upgrade');
            } else {
                // Turn on
                if (this.points < 500) {
                    alert('ポイントが足りません（500ポイント必要です）。');
                    return;
                }
                this.upgradeNextBet = true;
                this.els.btnGlobalUpgrade.classList.add('active-upgrade');
            }
        });

        document.querySelectorAll('.btn-bet').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                let side = e.currentTarget.getAttribute('data-side');
                this.betSide = side;

                // Unlock Speech API on mobile (must be synchronously bound to click event)
                if (window.speechSynthesis) {
                    let unlockUtterance = new SpeechSynthesisUtterance('');
                    unlockUtterance.volume = 0;
                    window.speechSynthesis.speak(unlockUtterance);
                }

                if (!this.upgradeNextBet) {
                    if(!this.leftFighter || !this.rightFighter) return;
                    this.startMatch();
                    return;
                }

                let cost = 500;
                if(this.points < cost) {
                    alert('ポイントが足りません（500ポイント必要です）。');
                    return;
                }

                if(!this.leftFighter || !this.rightFighter) return; 

                // Deduct points
                this.points -= cost;
                this.updatePointsDisplay();
                this.saveGame();

                // Disable buttons
                document.querySelectorAll('.btn-bet').forEach(b => b.disabled = true);
                this.els.btnGlobalUpgrade.disabled = true;
                
                // Turn off the active display since bet is placed
                this.upgradeNextBet = false;
                this.els.btnGlobalUpgrade.classList.remove('active-upgrade');

                let fighter = side === 'left' ? this.leftFighter : this.rightFighter;
                let spriteImg = side === 'left' ? this.els.leftSpriteImg : this.els.rightSpriteImg;

                // Play evolving animation
                spriteImg.classList.add('evolving');

                // Enforce minimum animation time and fetch concurrently
                let minWait = new Promise(r => setTimeout(r, 2500));
                
                let fetchLogic = (async () => {
                    let newId = await GameData.getEvolutionId(fighter.id);
                    let resultFighter = null;
                    if(newId !== fighter.id) {
                        resultFighter = await GameData.generateSpecificFighterAPI(newId);
                    } else {
                        resultFighter = await GameData.generateSpecificFighterAPI(fighter.id, true);
                    }
                    
                    // Override stats to be exactly 1.2x the pre-evolution stats
                    resultFighter.maxHp = Math.floor(fighter.maxHp * 1.5);
                    resultFighter.hp = resultFighter.maxHp;
                    resultFighter.atk = Math.floor(fighter.atk * 1.3);
                    resultFighter.def = Math.floor(fighter.def * 1.3);
                    resultFighter.spd = Math.floor(fighter.spd * 1.3);
                    
                    // Preload GIF so it doesn't pop before loading
                    await new Promise(resolve => {
                        let tempImg = new Image();
                        tempImg.onload = resolve;
                        tempImg.onerror = resolve;
                        tempImg.src = resultFighter.uiSpriteUrl;
                    });
                    return resultFighter;
                })();

                let evolvedFighter = await Promise.all([fetchLogic, minWait]).then(res => res[0]);

                spriteImg.classList.remove('evolving');

                // Apply new fighter
                if(side === 'left') {
                    this.leftFighter = evolvedFighter;
                    this.els.leftName.innerText = this.leftFighter.name;
                    this.els.leftName.style.color = GameData.rarity[this.leftFighter.rarity].color || '#fff';
                    this.els.leftStatsHp.innerText = this.leftFighter.maxHp;
                    this.els.leftStatsAtk.innerText = this.leftFighter.atk;
                    this.els.leftStatsDef.innerText = this.leftFighter.def;
                    this.els.leftStatsSpd.innerText = this.leftFighter.spd;
                    this.els.leftRarity.innerText = `[${GameData.rarity[this.leftFighter.rarity].name}] `;
                    this.els.leftRarity.style.color = GameData.rarity[this.leftFighter.rarity].color || '#aaa';
                    this.els.leftSpriteImg.src = this.leftFighter.uiSpriteUrl;
                } else {
                    this.rightFighter = evolvedFighter;
                    this.els.rightName.innerText = this.rightFighter.name;
                    this.els.rightName.style.color = GameData.rarity[this.rightFighter.rarity].color || '#fff';
                    this.els.rightStatsHp.innerText = this.rightFighter.maxHp;
                    this.els.rightStatsAtk.innerText = this.rightFighter.atk;
                    this.els.rightStatsDef.innerText = this.rightFighter.def;
                    this.els.rightStatsSpd.innerText = this.rightFighter.spd;
                    this.els.rightRarity.innerText = `[${GameData.rarity[this.rightFighter.rarity].name}] `;
                    this.els.rightRarity.style.color = GameData.rarity[this.rightFighter.rarity].color || '#aaa';
                    this.els.rightSpriteImg.src = this.rightFighter.uiSpriteUrl;
                }

                spriteImg.classList.add('evolved-pop');
                
                setTimeout(() => {
                    spriteImg.classList.remove('evolved-pop');
                    this.startMatch();
                }, 1000);
            });
        });
    }

    loadSave() {
        let save = localStorage.getItem('pokeBetSave');
        if(save) {
            let data = JSON.parse(save);
            // this.points = data.points || 1000; // 初期ポイントを1000で固定するためコメントアウト
            this.upgradeLevel = data.upgradeLevel || 0;
        }
    }

    saveGame() {
        localStorage.setItem('pokeBetSave', JSON.stringify({
            points: this.points,
            upgradeLevel: this.upgradeLevel
        }));
    }

    updatePointsDisplay() {
        this.els.points.innerText = this.points;
    }

    getUpgradeCost() {
        return 500 + (this.upgradeLevel * 500);
    }
    
    getBonusMultiplier() {
        return Math.min(1.0, this.upgradeLevel * 0.1); // Max +100% stats
    }

    updateUpgradeCost() {
        this.els.btnBuyUpg.innerText = `Cost: ${this.getUpgradeCost()}`;
    }

    async generateMatchup() {
        this.els.leftName.innerText = "読み込み中...";
        this.els.rightName.innerText = "読み込み中...";
        let bonus = this.getBonusMultiplier();
        this.leftFighter = await GameData.generateRandomFighterAPI(bonus);
        this.rightFighter = await GameData.generateRandomFighterAPI(bonus);

        // Calculate simple win probability based on raw stat totals
        let lStats = this.leftFighter.maxHp + this.leftFighter.atk + this.leftFighter.def + this.leftFighter.spd;
        let rStats = this.rightFighter.maxHp + this.rightFighter.atk + this.rightFighter.def + this.rightFighter.spd;
        
        // Force the win rate gap to be within 10% (between 45% and 55%) 
        // We do this by artificially scaling the right fighter's stats to be very close to the left fighter's.
        // The scale targets lStats +/- 10% equivalent.
        let targetRStats = lStats * (0.9 + Math.random() * 0.2); 
        let scale = targetRStats / rStats;
        
        this.rightFighter.maxHp = Math.floor(this.rightFighter.maxHp * scale);
        // We ensure current hp is matched to scaled maxHp
        this.rightFighter.hp = this.rightFighter.maxHp;
        this.rightFighter.atk = Math.floor(this.rightFighter.atk * scale);
        this.rightFighter.def = Math.floor(this.rightFighter.def * scale);
        this.rightFighter.spd = Math.floor(this.rightFighter.spd * scale);

        // Recalculate true stats after rounding
        rStats = this.rightFighter.maxHp + this.rightFighter.atk + this.rightFighter.def + this.rightFighter.spd;
        let total = lStats + rStats;
        
        let lProb = Math.round((lStats / total) * 100);
        let rProb = 100 - lProb;

        // Populate Left Card
        let lTypeIcon = getTypeIconHTML(this.leftFighter.types[0]);
        let lColor = GameData.rarity[this.leftFighter.rarity].color || '#fff';
        this.els.leftName.innerHTML = `${lTypeIcon}<span style="color:${lColor}">${this.leftFighter.name}</span>`;
        this.els.leftStatsHp.innerText = this.leftFighter.maxHp;
        this.els.leftStatsAtk.innerText = this.leftFighter.atk;
        this.els.leftStatsDef.innerText = this.leftFighter.def;
        this.els.leftStatsSpd.innerText = this.leftFighter.spd;
        this.els.leftProb.innerText = `${lProb}%`;
        this.els.leftRarity.innerText = `[${GameData.rarity[this.leftFighter.rarity].name}] `;
        this.els.leftRarity.style.color = GameData.rarity[this.leftFighter.rarity].color || '#aaa';

        // Populate Right Card
        let rTypeIcon = getTypeIconHTML(this.rightFighter.types[0]);
        let rColor = GameData.rarity[this.rightFighter.rarity].color || '#fff';
        this.els.rightName.innerHTML = `${rTypeIcon}<span style="color:${rColor}">${this.rightFighter.name}</span>`;
        this.els.rightStatsHp.innerText = this.rightFighter.maxHp;
        this.els.rightStatsAtk.innerText = this.rightFighter.atk;
        this.els.rightStatsDef.innerText = this.rightFighter.def;
        this.els.rightStatsSpd.innerText = this.rightFighter.spd;
        this.els.rightProb.innerText = `${rProb}%`;
        this.els.rightRarity.innerText = `[${GameData.rarity[this.rightFighter.rarity].name}] `;
        this.els.rightRarity.style.color = GameData.rarity[this.rightFighter.rarity].color || '#aaa';

        // Update Sprites
        this.els.leftSpriteImg.src = this.leftFighter.uiSpriteUrl;
        this.els.rightSpriteImg.src = this.rightFighter.uiSpriteUrl;

        // Re-enable buttons if they were disabled
        document.querySelectorAll('.btn-bet').forEach(b => b.disabled = false);
        if(this.els.btnGlobalUpgrade) {
            this.els.btnGlobalUpgrade.disabled = false;
            this.els.btnGlobalUpgrade.classList.remove('hidden');
        }
        
        // Reset global upgrade state
        this.upgradeNextBet = false;
        if(this.els.btnGlobalUpgrade) this.els.btnGlobalUpgrade.classList.remove('active-upgrade');

        this.showScreen('betting-screen');
    }

    showScreen(id) {
        this.els.betScreen.classList.remove('active');
        this.els.battleUi.classList.remove('active');
        if(id) document.getElementById(id).classList.add('active');
    }

    startMatch() {
        this.showScreen('battle-ui');
        
        if (this.els.btnGlobalUpgrade) this.els.btnGlobalUpgrade.classList.add('hidden');

        this.els.bNameL.innerText = this.leftFighter.name;
        this.els.bNameR.innerText = this.rightFighter.name;

        // Start battle via engine
        this.battleEngine.startBattle(this.leftFighter, this.rightFighter, {
            onMessage: (msg) => {
                this.els.bMsg.innerText = msg;
            },
            onHpChange: (side, current, max) => {
                let perc = Math.max(0, (current / max) * 100);
                if(side === 'left') {
                    this.els.bHpTxtL.innerText = `${current}/${max}`;
                    this.els.bFillL.style.width = `${perc}%`;
                    this.els.bFillL.style.backgroundColor = perc > 50 ? '#4cc9f0' : (perc > 20 ? '#fca311' : '#e63946');
                } else {
                    this.els.bHpTxtR.innerText = `${current}/${max}`;
                    this.els.bFillR.style.width = `${perc}%`;
                    this.els.bFillR.style.backgroundColor = perc > 50 ? '#4cc9f0' : (perc > 20 ? '#fca311' : '#e63946');
                }
            },
            onEnd: (winnerSide) => {
                this.handleResult(winnerSide);
            }
        });
    }

    handleResult(winnerSide) {
        this.els.resultScreen.classList.remove('hidden');
        
        let wonBet = (this.betSide === winnerSide);
        let betAmount = 100; // Fixed bet for now
        let reward = 200;

        if(wonBet) {
            AudioSystem.playVictoryMusic();
            this.els.resTitle.innerText = "勝利！";
            this.els.resTitle.style.color = "#06d6a0";
            this.els.resPoints.innerText = `+${reward}`;
            this.points += reward;
        } else {
            AudioSystem.playDefeatMusic();
            this.els.resTitle.innerText = "敗北...";
            this.els.resTitle.style.color = "#e63946";
            this.els.resPoints.innerText = `-${betAmount}`;
            this.points -= betAmount;
            if(this.points < 100) this.points = 100; // Mercy
        }

        this.updatePointsDisplay();
        this.saveGame();
    }
}

// Handles the visual side and sequence of battles
class BattleEngine {
    static CONFIG = {
        TURN_DAMAGE_SCALE_RATE: 0.05,
        TURN_HEAL_DECAY_RATE: 0.05,
        HEAL_MIN_MULT: 0.1,
        INITIAL_TURN_WAIT: 1000,
        BETWEEN_TURN_WAIT: 500
    };

    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        let fg = document.getElementById(canvasId + 'FG');
        if (fg) {
            this.canvasFG = fg;
            this.ctxFG = this.canvasFG.getContext('2d');
        }
        
        // Settings
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        
        this.particleSystem = new ParticleSystem();
        


        window.battleEngine = this;
        
        // Fighters
        this.leftFighter = null;
        this.leftSprite = null;
        this.rightFighter = null;
        this.rightSprite = null;

        // Visual states
        this.cameraObj = { x: 0, y: 0, zoom: 1 };
        this.shakeTicks = 0;
        this.shakeIntensity = 0;
        
        // Cache states
        this._lastLayerTransform = '';
        this._layerOriginSet = false;
        
        // Callbacks
        this.onMessage = null;
        this.onHpChange = null;
        this.onEnd = null;

        this.isRunning = false;
        this.battleSessionId = 0; // Session ID to prevent old loop interference

        // Base positions
        this.posLeft = { x: 200, y: 400 };
        this.posRight = { x: 600, y: 350 };
        
        this.battleMode = 'auto'; // 'auto', 'manual', or 'remote'
        this.resolvePlayerInput = null;
        this._forceBackground = null;
        this.isAutoSnapEnabled = true;

        // Default layout ratios (Safe fallback for all modes)
        this.targetXRatioL = 0.25;
        this.targetXRatioR = 0.75;
        this.targetYRatioL = 0.6;
        this.targetYRatioR = 0.55; 
    }

    // Explicit setter for background with logging
    set forceBackground(val) {
        console.log("BattleEngine: forceBackground explicitly SET to ->", val);
        this._forceBackground = val;
    }
    get forceBackground() {
        return this._forceBackground;
    }

    resize() {
        if (!this.canvas) return;
        // Maximum redundancy: clientWidth > window > manual attribute
        // Use Math.floor to avoid sub-pixel scaling artifacts (lines/noise)
        this.canvasWidth = Math.floor(this.canvas.clientWidth || window.innerWidth || this.canvas.width);
        this.canvasHeight = Math.floor(this.canvas.clientHeight || window.innerHeight || this.canvas.height);
        
        // Final safety: if it's still 0, use common fallback (800x600 for this game)
        if (!this.canvasWidth) this.canvasWidth = 800;
        if (!this.canvasHeight) this.canvasHeight = 600;
        
        // Sync internal resolution to CSS size
        if (this.canvas.width !== this.canvasWidth) this.canvas.width = this.canvasWidth;
        if (this.canvas.height !== this.canvasHeight) this.canvas.height = this.canvasHeight;
        
        if (this.canvasFG) {
            if (this.canvasFG.width !== this.canvasWidth) this.canvasFG.width = this.canvasWidth;
            if (this.canvasFG.height !== this.canvasHeight) this.canvasFG.height = this.canvasHeight;
        }
    }

    startBattle(leftFighter, rightFighter, callbacks) {
        this.leftFighter = leftFighter;
        this.rightFighter = rightFighter;
        
        let isPortrait = this.canvasHeight > this.canvasWidth;
        this.timeScale = isPortrait ? 1.2 : 1.0;
        
        // In manual mode there's a bottom panel, so raise sprites a bit
        // In manual/solo mode or tropical training mode, adjust sprite height to sit on the ground
        let yRatioL = (this.battleMode === 'manual') ? 0.58 : (isPortrait ? 0.70 : 0.65);
        let yRatioR = (this.battleMode === 'manual') ? 0.54 : (isPortrait ? 0.70 : 0.60);
        
        if (isPortrait) {
            this.posLeft  = { x: this.canvasWidth * 0.25, y: this.canvasHeight * yRatioL };
            this.posRight = { x: this.canvasWidth * 0.75, y: this.canvasHeight * yRatioR };
        } else {
            this.posLeft  = { x: this.canvasWidth * 0.25, y: this.canvasHeight * yRatioL };
            this.posRight = { x: this.canvasWidth * 0.75, y: this.canvasHeight * yRatioR };
        }

        document.getElementById('battle-sprite-layer').style.display = 'block';

        this.leftSprite = new Sprite(leftFighter.spriteKey);
        this.leftSprite.bindDOM(document.getElementById('dom-sprite-left'), leftFighter.uiSpriteUrl);
        this.leftSprite.x = this.posLeft.x;
        this.leftSprite.y = this.posLeft.y;
        this.leftSprite.flipX = true; // Flip so it faces right (towards opponent)
        this.leftSprite.scale = isPortrait ? (((1.6 / 1.44) / 1.2) / 1.2) : ((2.5 / 1.44) / 1.2); // 全体的にさらに1.2倍小さく調整

        this.rightSprite = new Sprite(rightFighter.spriteKey);
        this.rightSprite.bindDOM(document.getElementById('dom-sprite-right'), rightFighter.uiSpriteUrl);
        this.rightSprite.x = this.posRight.x;
        this.rightSprite.y = this.posRight.y;
        this.rightSprite.flipX = false; // Normal faces left (towards opponent)
        this.rightSprite.scale = isPortrait ? (((1.6 / 1.44) / 1.2) / 1.2) : ((2.5 / 1.44) / 1.2); // 全体的にさらに1.2倍小さく調整

        this.onMessage = callbacks.onMessage;
        this.onHpChange = callbacks.onHpChange;
        this.onEnd = callbacks.onEnd;

        this.particleSystem.clear();
        this.isRunning = true;
        this.cameraObj = { x: 0, y: 0, zoom: 1 };
        this.turnCount = 0;

        // Initial HP Update
        this.onHpChange('left', this.leftFighter.hp, this.leftFighter.maxHp);
        this.onHpChange('right', this.rightFighter.hp, this.rightFighter.maxHp);

        // Start BGM
        if (typeof AudioSystem !== 'undefined') AudioSystem.playBattleMusic();

        // Start battle loop asynchronously
        setTimeout(() => this.battleLoopTick(), BattleEngine.CONFIG.INITIAL_TURN_WAIT * (this.timeScale || 1));
    }

    // Remote battle initialization (PokeSolo)
    startRemoteBattle(leftFighter, rightFighter, callbacks) {
        console.log("[BattleEngine] Starting Remote Battle Session...");
        this.leftFighter = leftFighter;
        this.rightFighter = rightFighter;
        this.battleMode = 'remote'; // Explicitly set remote mode
        this.battleSessionId++; // New session to kill any old loops

        // --- 1. INITIALIZE DIMENSIONS & RATIOS FIRST ---
        this.resize(); 
        
        let isPortrait = this.canvasHeight > this.canvasWidth;
        this.timeScale = isPortrait ? 1.2 : 1.0;
        
        this.targetYRatioL = 0.58; 
        this.targetYRatioR = isPortrait ? 0.65 : 0.54;
        this.targetXRatioL = 0.25;
        this.targetXRatioR = 0.75;
        
        this.posLeft  = { x: this.canvasWidth * this.targetXRatioL, y: this.canvasHeight * this.targetYRatioL };
        this.posRight = { x: this.canvasWidth * this.targetXRatioR, y: this.canvasHeight * this.targetYRatioR };

        // --- 2. SETUP UI ---
        let spriteLayer = document.getElementById('battle-sprite-layer');
        if (spriteLayer) {
            spriteLayer.style.display = 'block';
            spriteLayer.style.zIndex = '50';
        }
        
        if (this.canvasFG) {
            this.canvasFG.style.zIndex = '1000'; // Force to very top
            this.canvasFG.style.display = 'block';
            this.canvasFG.style.pointerEvents = 'none'; // Ensure clicks pass through to buttons
        }

        this.leftSprite = new Sprite(leftFighter.spriteKey);
        this.leftSprite.bindDOM(document.getElementById('dom-sprite-left'), leftFighter.uiSpriteUrl);
        this.leftSprite.x = this.posLeft.x;
        this.leftSprite.y = this.posLeft.y;
        this.leftSprite.flipX = true; // Faces Right
        this.leftSprite.scale = isPortrait ? ((1.6 / 1.44) / 1.2) : (2.5 / 1.44);

        this.rightSprite = new Sprite(rightFighter.spriteKey);
        this.rightSprite.bindDOM(document.getElementById('dom-sprite-right'), rightFighter.uiSpriteUrl);
        this.rightSprite.x = this.posRight.x;
        this.rightSprite.y = this.posRight.y;
        this.rightSprite.flipX = false; // Faces Left
        this.rightSprite.scale = isPortrait ? ((1.6 / 1.44) / 1.2) : (2.5 / 1.44);

        this.onHpChange = callbacks.onHpChange;
        this.onEnd = callbacks.onEnd;

        this.particleSystem.clear();
        this.isRunning = true;
        this.cameraObj = { x: 0, y: 0, zoom: 1 };

        this.onHpChange('left', this.leftFighter.hp, this.leftFighter.maxHp);
        this.onHpChange('right', this.rightFighter.hp, this.rightFighter.maxHp);
        
        if (typeof AudioSystem !== 'undefined') AudioSystem.playBattleMusic();

        // --- RENDER LOOP is handled by main.js ---
    }

    // --- NEW: RESPONSIVE ANIMATION METHODS ---
    
    // Part A: Immediate feedback when player clicks a skill
    async executeLocalLunge(attackerSide, skillName, skillId = null) {
        if (!this.isRunning) return;
        this.isAutoSnapEnabled = false;

        const attacker = attackerSide === 'left' ? this.leftFighter : this.rightFighter;
        const attackerSprite = attackerSide === 'left' ? this.leftSprite : this.rightSprite;

        // Store skillId and skillName for the impact phase
        attackerSprite._currentSkillId = skillId;
        attackerSprite._currentSkillName = skillName;

        if (this.onMessage) this.onMessage(`${attacker.name} の ${skillName}！`);
        if (typeof AudioSystem !== 'undefined') AudioSystem.speakSkill(skillName);

        // Save original pos for return phase
        attackerSprite._startX = attackerSprite.x;
        attackerSprite._startY = attackerSprite.y;

        let isPortrait = this.canvasHeight > this.canvasWidth;
        let dx = isPortrait ? 0 : (attackerSide === 'left' ? 50 : -50); // Match PokeTrain 50
        let dy = isPortrait ? -50 : 0;

        await Promise.all([
            dx !== 0 ? this.tween(attackerSprite, 'x', attackerSprite.x + dx, 200) : Promise.resolve(),
            dy !== 0 ? this.tween(attackerSprite, 'y', attackerSprite.y + dy, 200) : Promise.resolve(),
            this.tween(this.cameraObj, 'zoom', 1.1, 200), // Match PokeTrain 1.1
            this.tween(this.cameraObj, 'x', dx, 200),
            this.tween(this.cameraObj, 'y', dy, 200)
        ]);
        


        attackerSprite.play('attack');
    }

    // Part B: Finalize hit/damage once server replies
    async executeRemoteImpact(data) {
        const currentSession = this.battleSessionId;
        if (!this.isRunning) return;

        console.log("[BattleEngine] executeRemoteImpact RECEIVED:", data);
        
        try {
            const attackerSide = data.side || 'left';
            const defenderSide = attackerSide === 'left' ? 'right' : 'left';

            const attacker = attackerSide === 'left' ? this.leftFighter : this.rightFighter;
            const defender = defenderSide === 'left' ? this.leftFighter : this.rightFighter;
            
            const attackerSprite = attackerSide === 'left' ? this.leftSprite : this.rightSprite;
            const defenderSprite = defenderSide === 'left' ? this.leftSprite : this.rightSprite;

            // Wait a bit for visibility (Match PokeTrain 400ms)
            await this.wait(400);

            // Use provided skillId/skillName or fall back to locally stored ones
            const skillId = data.skillId || attackerSprite._currentSkillId;
            const skillName = data.skillName || attackerSprite._currentSkillName;

            // Target detection
            const defX = Number.isFinite(defenderSprite.x) ? defenderSprite.x : 0;
            const defY = Number.isFinite(defenderSprite.y) ? defenderSprite.y : 0;
            const attX = Number.isFinite(attackerSprite.x) ? attackerSprite.x : 0;
            const attY = Number.isFinite(attackerSprite.y) ? attackerSprite.y : 0;

            // Determine type robustly
            const derivedType = data.type || (skillId === 'heal' ? 'heal' : (skillId === 'shield' ? 'buff' : 'attack'));

            if (derivedType === 'heal' || data.heal > 0) {
                // --- HEAL ROUTE (Target: Attacker/Self) ---
                if(data.hp && data.hp[attacker.id]) attacker.hp = data.hp[attacker.id];
                this.onHpChange(attackerSide, attacker.hp, attacker.maxHp);
                
                this.particleSystem.addFloatingText(attX, attY - 100, `+${data.heal || 0}`, '#06d6a0', 30);
                this.particleSystem.addSkillEffect(skillId || 'heal', attX, attY - 50, attackerSide, attX, attY, skillName);
            } 
            else if (derivedType === 'buff') {
                // --- BUFF ROUTE (Target: Attacker/Self) ---
                this.particleSystem.addFloatingText(attX, attY - 100, `GUARD!`, '#4cc9f0', 24);
                this.particleSystem.addSkillEffect(skillId || 'shield', attX, attY, attackerSide, attX, attY, skillName);
            } 
            else {
                // --- ATTACK ROUTE (Target: Defender/Opponent) ---
                if(data.hp && data.hp[defender.id]) defender.hp = data.hp[defender.id];
                this.onHpChange(defenderSide, defender.hp, defender.maxHp);
                
                const isBlocked = (data.damage === 0) || data.wasBlocked;
                
                if (isBlocked) {
                    // Blocked! No hit animation, just blue GUARD! on the defender
                    this.particleSystem.addFloatingText(defX, defY - 100, `GUARD!`, '#4cc9f0', 32);
                } else {
                    // Normal hit on the defender
                    this.shakeCamera(10, 10);
                    defenderSprite.play('hit');
                    defenderSprite.flashWhite = true;
                    this.particleSystem.addFloatingText(defX, defY - 100, `-${data.damage}`, '#e63946', 32);
                }

                this.particleSystem.addSkillEffect(skillId || 'tackle', defX, defY, attackerSide, attX, attY, skillName);
                
                if (!isBlocked) {
                    await this.wait(200);
                    defenderSprite.flashWhite = false;
                }
            }

            await this.wait(400); // Match PokeTrain 400ms
            
            // Return to start
            await Promise.all([
                this.tween(attackerSprite, 'x', attackerSprite._startX, 300),
                this.tween(attackerSprite, 'y', attackerSprite._startY, 300),
                this.tween(this.cameraObj, 'zoom', 1.0, 300),
                this.tween(this.cameraObj, 'x', 0, 300),
                this.tween(this.cameraObj, 'y', 0, 300)
            ]);
            
            attackerSprite.play('idle');
            if (defender && defender.hp <= 0) {
                defenderSprite.play('faint');
                await this.wait(1000);
            }
        } finally {
            this.isAutoSnapEnabled = true;
        }
    }

    // Full sequence (for opponent turns)
    async executeRemoteAction(data) {
        if (!this.isRunning) return;
        const side = data.side || 'right';
        await this.executeLocalLunge(side, data.skillName, data.skillId);
        await this.executeRemoteImpact(data);
    }

    stop() {
        this.isRunning = false;
        let layer = document.getElementById('battle-sprite-layer');
        if (layer) layer.style.display = 'none';
        if (typeof AudioSystem !== 'undefined') AudioSystem.stopBattleMusic();
    }

    // Helper to pause execution
    wait(ms) {
        return new Promise(res => setTimeout(res, ms * (this.timeScale || 1)));
    }

    // Helper to tween a property on an object
    tween(obj, prop, target, durationMs) {
        let actualDuration = durationMs * (this.timeScale || 1);
        return new Promise(res => {
            let start = obj[prop];
            let diff = target - start;
            let startTime = null;
            let step = (time) => {
                if (!startTime) startTime = time;
                let elapsed = time - startTime;
                let t = elapsed / actualDuration;
                if(t >= 1) {
                    obj[prop] = target;
                    res();
                } else {
                    // Ease out quadratic
                    obj[prop] = start + diff * (t * (2 - t));
                    requestAnimationFrame(step);
                }
            };
            requestAnimationFrame(step);
        });
    }

    shakeCamera(intensity, durationTicks) {
        this.shakeIntensity = intensity;
        this.shakeTicks = durationTicks;
    }

    async battleLoopTick() {
        const sessionAtStart = this.battleSessionId;
        if(!this.isRunning || this.battleMode === 'remote') {
            console.log("[BattleEngine] Auto-Loop Stopped (Remote Mode or Not Running)");
            return;
        }

        // Determine Speed / Turn order
        let lSpeed = this.leftFighter.spd;
        let rSpeed = this.rightFighter.spd;
        
        let first, second, firstSide, secondSide;

        // Determine who goes first based on Speed (higher moves first)
        // In case of speed tie, random choice for fairness
        let leftGoesFirst = true;
        if (rSpeed > lSpeed) {
            leftGoesFirst = false;
        } else if (lSpeed === rSpeed) {
            leftGoesFirst = Math.random() < 0.5;
        }

        if (leftGoesFirst) {
            first = this.leftFighter;
            second = this.rightFighter;
            firstSide = 'left';
            secondSide = 'right';
        } else {
            first = this.rightFighter;
            second = this.leftFighter;
            firstSide = 'right';
            secondSide = 'left';
        }
        // --- Turn 1 ---
        await this.executeTurn(first, second, firstSide, secondSide);
        if(!this.isRunning || !second.isAlive()) {
            return this.endBattle();
        }

        // --- Turn 2 ---
        await this.executeTurn(second, first, secondSide, firstSide);
        if(!this.isRunning || !first.isAlive()) {
            return this.endBattle();
        }

        // Loop if still in same session
        setTimeout(() => {
            if (this.battleSessionId === sessionAtStart) this.battleLoopTick();
        }, BattleEngine.CONFIG.BETWEEN_TURN_WAIT * (this.timeScale || 1));
    }

    async executeTurn(attacker, defender, attackerSide, defenderSide) {
        this.turnCount++;
        // A "turn" consists of 2 actions. We scale by turn (round) instead of individual action count.
        const roundCount = Math.floor((this.turnCount - 1) / 2);
        let damageMult = 1.0 + (roundCount * BattleEngine.CONFIG.TURN_DAMAGE_SCALE_RATE); // Damage increases each turn
        let healMult = Math.max(BattleEngine.CONFIG.HEAL_MIN_MULT, 1.0 - (roundCount * BattleEngine.CONFIG.TURN_HEAL_DECAY_RATE)); // Healing decreases
        
        // Tick cooldowns
        attacker.skills.forEach(s => s.tickCooldown());
        
        // Reset protection status from previous use when starting a new turn
        attacker.isProtecting = false;

        // Select skill
        let skill = null;
        if (this.battleMode === 'manual' && attacker.playerControlled) {
            this.onMessage(`${attacker.name} の番です！`);
            skill = await new Promise(resolve => {
                this.resolvePlayerInput = resolve;
            });
        } else {
            skill = AIController.chooseSkill(attacker, defender);
        }
        
        skill.use();

        this.onMessage(`${attacker.name} の ${skill.name}！`);
        
        // Calculate Type Effectiveness (PokeTrain specific logic integration)
        let effectiveness = 1.0;
        if (typeof TrainBattleController !== 'undefined') {
            effectiveness = TrainBattleController.getEffectiveness(skill.element, defender.types);
            if (effectiveness > 1) this.onMessage(`${attacker.name} の ${skill.name}！\nこうかは ばつぐんだ！`);
            if (effectiveness < 1 && effectiveness > 0) this.onMessage(`${attacker.name} の ${skill.name}！\nこうかは いまひとつの ようだ...`);
        }

        if (typeof AudioSystem !== 'undefined') AudioSystem.speakSkill(skill.name);
        
        let attackerSprite = attackerSide === 'left' ? this.leftSprite : this.rightSprite;
        let defenderSprite = defenderSide === 'left' ? this.leftSprite : this.rightSprite;
        let startX = attackerSprite.x;
        let startY = attackerSprite.y;

        let isPortrait = this.canvasHeight > this.canvasWidth;
        let dx = isPortrait ? 0 : (attackerSide === 'left' ? 50 : -50);
        let dy = isPortrait ? -50 : 0;

        // Timeline: Move forward
        let movePromises = [];
        if(dx !== 0) movePromises.push(this.tween(attackerSprite, 'x', startX + dx, 200));
        if(dy !== 0) movePromises.push(this.tween(attackerSprite, 'y', startY + dy, 200));
        if(movePromises.length > 0) await Promise.all(movePromises);

        // Timeline: Attack animation
        attackerSprite.play('attack');
        
        // Camera Zoom to action
        this.tween(this.cameraObj, 'zoom', 1.1, 200);
        this.tween(this.cameraObj, 'x', dx, 200);
        this.tween(this.cameraObj, 'y', dy, 200);

        await this.wait(400); // Wait for hit frame roughly

        if(skill.type === 'heal') {
            let baseHeal = Math.max(15, Math.floor(40 * healMult));
            let amount = attacker.heal(baseHeal);
            this.onHpChange(attackerSide, attacker.hp, attacker.maxHp);
            this.particleSystem.addFloatingText(attackerSprite.x, attackerSprite.y - 100, `+${amount}`, '#06d6a0', 30);
            this.particleSystem.addSkillEffect(skill.id, attackerSprite.x, Math.max(0, attackerSprite.y - 50), attackerSide, attackerSprite.x, attackerSprite.y);
            this.onMessage(`${attacker.name} はHPを回復した！`);
        } 
        else if (skill.type === 'buff') {
            if (skill.id === 'shield') {
                attacker.isProtecting = true;
                this.particleSystem.addFloatingText(attackerSprite.x, attackerSprite.y - 100, `まもる!`, '#457b9d', 24);
                this.onMessage(`${attacker.name} は 身を守る構えをとった！`);
            } else {
                // Other buffs (fallback if any added later)
                if (attacker.def < 200) {
                    attacker.def = Math.floor(attacker.def * 1.2) + 15;
                    if (attacker.def > 200) attacker.def = 200;
                }
                this.particleSystem.addFloatingText(attackerSprite.x, attackerSprite.y - 100, `防御アップ`, '#457b9d', 24);
            }
            this.particleSystem.addSkillEffect(skill.id, attackerSprite.x, attackerSprite.y, attackerSide, attackerSprite.x, attackerSprite.y);
        }
        else {
            // Attack!
            // Calculate Damage slightly randomized
            let baseDmg = (attacker.atk * skill.power) / 50;
            baseDmg = (baseDmg / 5) * damageMult; // Apply scaling damage
            
            // Apply effectiveness if available
            let effort = (typeof effectiveness !== 'undefined') ? effectiveness : 1.0;
            
            let finalDmgMult = effort;
            if (defender.isProtecting) {
                finalDmgMult *= 0.5;
                this.onMessage(`${defender.name} は攻撃を防いだ！`);
                this.particleSystem.addFloatingText(defenderSprite.x + defenderSprite.visualOffsetX, defenderSprite.y + defenderSprite.visualOffsetY - 120, `GUARD!`, '#4cc9f0', 28);
                defender.isProtecting = false; // Consume protection
            }
            
            let actualDmg = defender.takeDamage(baseDmg * (0.8 + Math.random()*0.4) * finalDmgMult);
            this.onHpChange(defenderSide, defender.hp, defender.maxHp);

            // Impact Effects
            this.shakeCamera(10, 10);
            defenderSprite.play('hit');
            defenderSprite.flashWhite = true;
            try {
                this.particleSystem.addSkillEffect(skill.id, defenderSprite.x + defenderSprite.visualOffsetX, defenderSprite.y + defenderSprite.visualOffsetY, attackerSide, attackerSprite.x + attackerSprite.visualOffsetX, attackerSprite.y + attackerSprite.visualOffsetY, skill.name);
            } catch (e) {
                console.error("[BattleEngine] Skill effect error:", e);
            }
            this.particleSystem.addFloatingText(defenderSprite.x + defenderSprite.visualOffsetX, defenderSprite.y + defenderSprite.visualOffsetY - 100, `-${actualDmg}`, '#e63946', 32);

            await this.wait(200);
            defenderSprite.flashWhite = false;
        }

        await this.wait(400);

        // Timeline: Return
        this.tween(attackerSprite, 'x', startX, 300);
        this.tween(attackerSprite, 'y', startY, 300);
        this.tween(this.cameraObj, 'zoom', 1.0, 300);
        this.tween(this.cameraObj, 'x', 0, 300);
        this.tween(this.cameraObj, 'y', 0, 300);
        
        await this.wait(500);

        if(!defender.isAlive()) {
            defenderSprite.play('faint');
            await this.wait(1000);
        }
    }

    endBattle() {
        this.isRunning = false;
        let layer = document.getElementById('battle-sprite-layer');
        if (layer) layer.style.display = 'none';
        if (typeof AudioSystem !== 'undefined') AudioSystem.stopBattleMusic();
        let winnerSide = this.leftFighter.isAlive() ? 'left' : 'right';
        this.onEnd(winnerSide);
    }


    render() {
        // Ensure canvasFG is synced to the world size every frame to prevent coordinate drift
        if (this.canvasFG) {
            if (this.canvasFG.width !== this.canvasWidth) this.canvasFG.width = this.canvasWidth;
            if (this.canvasFG.height !== this.canvasHeight) this.canvasFG.height = this.canvasHeight;
        }

        if (this.ctxFG) {
            this.ctxFG.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            this.ctxFG.globalCompositeOperation = 'source-over';
            this.ctxFG.globalAlpha = 1.0;
        }
        
        // --- CRITICAL STATE RESET ---
        // Ensure that previous frame's skill effects (lighter mode, opacity) 
        // don't leak into the background drawing of this frame.
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1.0;
        
        // Clear background with black
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // --- 1. COORDINATE LOGIC (Resizing & Snapping) ---
        if (this.isRunning && this.leftSprite && this.rightSprite) {
            this.resize();
            
            // Recalculate target positions if ratios are known
            this.posLeft.x = this.canvasWidth * this.targetXRatioL;
            this.posLeft.y = this.canvasHeight * this.targetYRatioL;
            this.posRight.x = this.canvasWidth * this.targetXRatioR;
            this.posRight.y = this.canvasHeight * this.targetYRatioR;
            
            // Step 1: Logistic Snap (Override coordinates ONLY when idle and no camera offset)
            if (this.isAutoSnapEnabled && Math.abs(this.cameraObj.x) < 0.1 && Math.abs(this.cameraObj.y) < 0.1) {
                this.leftSprite.x = this.posLeft.x;
                this.leftSprite.y = this.posLeft.y;
                this.rightSprite.x = this.posRight.x;
                this.rightSprite.y = this.posRight.y;
            }
        }
        
        // --- 2. UNIVERSAL DOM POSITIONING (PokeSolo, PokeBet, etc) ---
        if (this.isRunning && this.leftSprite && this.rightSprite) {
            if (this.leftSprite.domElement) {
                let scaleFactor = this.leftSprite.scale * 1.2;
                this.leftSprite.domElement.style.left = (this.leftSprite.x - 48 * scaleFactor) + 'px';
                this.leftSprite.domElement.style.top = (this.leftSprite.y - 48 * scaleFactor) + 'px';
            }
            if (this.rightSprite.domElement) {
                let scaleFactor = this.rightSprite.scale * 1.2;
                this.rightSprite.domElement.style.left = (this.rightSprite.x - 48 * scaleFactor) + 'px';
        this.rightSprite.domElement.style.top = (this.rightSprite.y - 48 * scaleFactor) + 'px';
            }
        }

        let cx = 0, cy = 0;
        if(this.shakeTicks > 0) {
            cx = (Math.random() - 0.5) * this.shakeIntensity;
            cy = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeTicks--;
        }

        // --- ASPECT RATIO AWARE BACKGROUND (Center-Cover) ---
        let bgKey = this._forceBackground;
        
        if (!bgKey) {
            const soloUI = document.getElementById('pokesolo-battle-ui');
            const trainUI = document.getElementById('train-battle-ui');
            const betUI = document.getElementById('battle-ui');

            const isSolo = soloUI && soloUI.classList.contains('active') && !soloUI.classList.contains('hidden');
            const isTrain = trainUI && trainUI.classList.contains('active') && !trainUI.classList.contains('hidden');
            const isBet = betUI && betUI.classList.contains('active') && !betUI.classList.contains('hidden');
            
            if (isSolo) {
                bgKey = "bg_soccer";
            } else if (isTrain) {
                bgKey = "bg_train";
            } else if (isBet) {
                bgKey = "bg_arena";
            } else {
                bgKey = (this.canvasHeight > this.canvasWidth ? "bg_train" : "bg_arena");
            }
        }
        
        let bgImg = AssetGenerator.get(bgKey);

        if(bgImg && bgImg.complete && bgImg.width > 0) {
            const imgAspect = bgImg.width / bgImg.height;
            const canvasAspect = this.canvasWidth / this.canvasHeight;
            let drawWidth, drawHeight, offsetX, offsetY;

            if (canvasAspect > imgAspect) {
                drawWidth = this.canvasWidth;
                drawHeight = this.canvasWidth / imgAspect;
                offsetX = 0;
                offsetY = (this.canvasHeight - drawHeight) / 2;
            } else {
                drawHeight = this.canvasHeight;
                drawWidth = this.canvasHeight * imgAspect;
                offsetY = 0;
                offsetX = (this.canvasWidth - drawWidth) / 2;
            }
            this.ctx.drawImage(bgImg, offsetX, offsetY, drawWidth, drawHeight);
        } else if (bgImg) {
            // Dark fill while loading
            this.ctx.fillStyle = "#0c0c1e";
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        }

        this.ctx.save();
        
        // Apply Camera
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        const camX = (this.cameraObj.x || 0) + cx;
        const camY = (this.cameraObj.y || 0) + cy;
        const zoom = this.cameraObj.zoom || 1;

        this.ctx.translate(centerX, centerY);
        this.ctx.scale(zoom, zoom);
        this.ctx.translate(-centerX + camX, -centerY + camY);

        // Apply same to DOM layer to sync with Camera
        let layerDom = document.getElementById('battle-sprite-layer');
        if (layerDom) {
            let layerTransform = `translate(${centerX}px, ${centerY}px) scale(${zoom}) translate(${-centerX + camX}px, ${-centerY + camY}px)`;
            if (this._lastLayerTransform !== layerTransform) {
                layerDom.style.transform = layerTransform;
                this._lastLayerTransform = layerTransform;
            }
            if (!this._layerOriginSet) {
                layerDom.style.transformOrigin = '0 0';
                this._layerOriginSet = true;
            }
        }

        // Setup Auras based on rarity
        if(this.leftFighter && GameData.rarity[this.leftFighter.rarity]) {
            let leftColor = GameData.rarity[this.leftFighter.rarity].color;
            if(leftColor && this.leftFighter.isAlive()) this.particleSystem.emitAura(this.leftSprite.x, this.leftSprite.y, leftColor);
        }
        if(this.rightFighter && GameData.rarity[this.rightFighter.rarity]) {
            let rightColor = GameData.rarity[this.rightFighter.rarity].color;
            if(rightColor && this.rightFighter.isAlive()) this.particleSystem.emitAura(this.rightSprite.x, this.rightSprite.y, rightColor);
        }

        // Draw Shadows/Back particles
        // ...

        // Draw Sprites (Fallback if not using DOM layer)
        // Right sprite is higher (y is smaller) or equal, so draw it first for proper depth
        if(this.rightSprite) {
            this.rightSprite.update();
            this.rightSprite.draw(this.ctx);
        }
        if(this.leftSprite) {
            this.leftSprite.update();
            this.leftSprite.draw(this.ctx);
        }

        // Draw Foreground Particles to the isolated canvas over everything!
        if (!this.canvasFG) this.canvasFG = document.getElementById('gameCanvasFG');
        if (this.canvasFG && !this.ctxFG) this.ctxFG = this.canvasFG.getContext('2d');
        
        let targetCtx = this.ctxFG || this.ctx;

        if (targetCtx === this.ctxFG) {
            targetCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            targetCtx.save();
            targetCtx.translate(centerX, centerY);
            targetCtx.scale(zoom, zoom);
            targetCtx.translate(-centerX + camX, -centerY + camY);
            
            this.particleSystem.update();
            this.particleSystem.draw(targetCtx);

            targetCtx.restore();
        } else {
            // Draw on main ctx (already transformed)
            this.particleSystem.update();
            this.particleSystem.draw(targetCtx);
        }

        this.ctx.restore();
    }
}

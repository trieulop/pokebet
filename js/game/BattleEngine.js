// Handles the visual side and sequence of battles
class BattleEngine {
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

        // Base positions
        this.posLeft = { x: 200, y: 400 };
        this.posRight = { x: 600, y: 350 };
        
        this.battleMode = 'auto'; // 'auto' or 'manual'
        this.resolvePlayerInput = null;
        this.forceBackground = null;
    }

    startBattle(leftFighter, rightFighter, callbacks) {
        this.leftFighter = leftFighter;
        this.rightFighter = rightFighter;
        
        let isPortrait = this.canvasHeight > this.canvasWidth;
        this.timeScale = isPortrait ? 1.2 : 1.0;
        
        // In manual mode there's a bottom panel, so raise sprites a bit
        let yRatioL = (this.battleMode === 'manual') ? 0.58 : 0.65;
        let yRatioR = (this.battleMode === 'manual') ? 0.54 : (isPortrait ? 0.65 : 0.60);
        
        if (isPortrait) {
            this.posLeft  = { x: this.canvasWidth * 0.25, y: this.canvasHeight * yRatioL };
            this.posRight = { x: this.canvasWidth * 0.75, y: this.canvasHeight * yRatioR };
        } else {
            this.posLeft  = { x: this.canvasWidth * 0.25, y: this.canvasHeight * yRatioL };
            this.posRight = { x: this.canvasWidth * 0.75, y: this.canvasHeight * yRatioR };
        }

        document.getElementById('battle-sprite-layer').style.display = 'block';

        document.getElementById('battle-sprite-layer').style.display = 'block';

        this.leftSprite = new Sprite(leftFighter.spriteKey);
        this.leftSprite.bindDOM(document.getElementById('dom-sprite-left'), leftFighter.uiSpriteUrl);
        this.leftSprite.x = this.posLeft.x;
        this.leftSprite.y = this.posLeft.y;
        this.leftSprite.flipX = true; // Flip so it faces right (towards opponent)
        this.leftSprite.scale = isPortrait ? ((1.6 / 1.44) / 1.2) : (2.5 / 1.44); // スマホのみさらに1.2倍小さく

        this.rightSprite = new Sprite(rightFighter.spriteKey);
        this.rightSprite.bindDOM(document.getElementById('dom-sprite-right'), rightFighter.uiSpriteUrl);
        this.rightSprite.x = this.posRight.x;
        this.rightSprite.y = this.posRight.y;
        this.rightSprite.flipX = false; // Normal faces left (towards opponent)
        this.rightSprite.scale = isPortrait ? ((1.6 / 1.44) / 1.2) : (2.5 / 1.44); // スマホのみさらに1.2倍小さく

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
        setTimeout(() => this.battleLoopTick(), 1000 * (this.timeScale || 1));
    }

    stop() {
        this.isRunning = false;
        let layer = document.getElementById('battle-sprite-layer');
        if (layer) layer.style.display = 'none';
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
        if(!this.isRunning) return;

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

        // Loop
        setTimeout(() => this.battleLoopTick(), 500 * (this.timeScale || 1));
    }

    async executeTurn(attacker, defender, attackerSide, defenderSide) {
        this.turnCount++;
        let damageMult = 1.0 + (this.turnCount * 0.05); // Damage increases by 5% each turn
        let healMult = Math.max(0.1, 1.0 - (this.turnCount * 0.05)); // Healing decreases down to 10%
        
        // Tick cooldowns
        attacker.skills.forEach(s => s.tickCooldown());

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
            let baseHeal = Math.max(5, Math.floor(40 * healMult));
            let amount = attacker.heal(baseHeal);
            this.onHpChange(attackerSide, attacker.hp, attacker.maxHp);
            this.particleSystem.addFloatingText(attackerSprite.x, attackerSprite.y - 100, `+${amount}`, '#06d6a0', 30);
            this.particleSystem.addSkillEffect(skill.id, attackerSprite.x, Math.max(0, attackerSprite.y - 50), attackerSide, attackerSprite.x, attackerSprite.y);
            this.onMessage(`${attacker.name} はHPを回復した！`);
        } 
        else if (skill.type === 'buff') {
            // 防御バフが無限に指数関数的に倍増してダメージが1に張り付く不具合を修正
            // 倍率を少しマイルドにし、上限値（200）を設けて長期戦によるダメージインフレが上回るように調整
            if (attacker.def < 200) {
                attacker.def = Math.floor(attacker.def * 1.2) + 15;
                if (attacker.def > 200) attacker.def = 200;
            }
            this.particleSystem.addFloatingText(attackerSprite.x, attackerSprite.y - 100, `防御アップ`, '#457b9d', 24);
            this.particleSystem.addSkillEffect(skill.id, attackerSprite.x, attackerSprite.y, attackerSide, attackerSprite.x, attackerSprite.y);
        }
        else {
            // Attack!
            // Calculate Damage slightly randomized
            let baseDmg = (attacker.atk * skill.power) / 50;
            baseDmg = (baseDmg / 5) * damageMult; // Apply scaling damage
            
            // Apply effectiveness if available
            let effort = (typeof effectiveness !== 'undefined') ? effectiveness : 1.0;
            
            let actualDmg = defender.takeDamage(baseDmg * (0.8 + Math.random()*0.4) * effort);
            this.onHpChange(defenderSide, defender.hp, defender.maxHp);

            // Impact Effects
            this.shakeCamera(10, 10);
            defenderSprite.play('hit');
            defenderSprite.flashWhite = true;
            this.particleSystem.addSkillEffect(skill.id, defenderSprite.x, defenderSprite.y, attackerSide, attackerSprite.x, attackerSprite.y);
            this.particleSystem.addFloatingText(defenderSprite.x, defenderSprite.y - 100, `-${actualDmg}`, '#e63946', 32);

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
        if (this.ctxFG) {
            this.ctxFG.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
        
        // Clear background with black (should rely on bg sprite really)
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        let cx = 0, cy = 0;
        if(this.shakeTicks > 0) {
            cx = (Math.random() - 0.5) * this.shakeIntensity;
            cy = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeTicks--;
        }

        this.ctx.save();
        
        // Apply Camera
        this.ctx.translate(this.canvasWidth/2, this.canvasHeight/2);
        this.ctx.scale(this.cameraObj.zoom, this.cameraObj.zoom);
        this.ctx.translate(-this.canvasWidth/2 + this.cameraObj.x + cx, -this.canvasHeight/2 + cy);

        // Apply same to DOM layer to sync with Camera
        let layerDom = document.getElementById('battle-sprite-layer');
        if (layerDom) {
            let layerTransform = `translate(${this.canvasWidth/2}px, ${this.canvasHeight/2}px) scale(${this.cameraObj.zoom}) translate(${-this.canvasWidth/2 + this.cameraObj.x + cx}px, ${-this.canvasHeight/2 + cy}px)`;
            if (this._lastLayerTransform !== layerTransform) {
                layerDom.style.transform = layerTransform;
                this._lastLayerTransform = layerTransform;
            }
            if (!this._layerOriginSet) {
                layerDom.style.transformOrigin = '0 0';
                this._layerOriginSet = true;
            }
        }

        // Draw Arena/Train Background – stretched to fill full canvas
        let bgKey = this.forceBackground || 'bg_arena';
        let bgImg = AssetGenerator.get(bgKey);
        if(bgImg) {
            // use the logical canvas dimensions so the bg always fills the viewport
            this.ctx.drawImage(bgImg, 0, 0, this.canvasWidth, this.canvasHeight);
        }

        // Setup Auras based on rarity
        if(this.leftFighter) {
            let leftColor = GameData.rarity[this.leftFighter.rarity].color;
            if(leftColor && this.leftFighter.isAlive()) this.particleSystem.emitAura(this.leftSprite.x, this.leftSprite.y, leftColor);
        }
        if(this.rightFighter) {
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
        let targetCtx = this.ctxFG || this.ctx;
        if (this.ctxFG) {
            targetCtx.save();
            targetCtx.translate(this.canvasWidth/2, this.canvasHeight/2);
            targetCtx.scale(this.cameraObj.zoom, this.cameraObj.zoom);
            targetCtx.translate(-this.canvasWidth/2 + this.cameraObj.x + cx, -this.canvasHeight/2 + cy);
        }

        this.particleSystem.update();
        this.particleSystem.draw(targetCtx);

        if (this.ctxFG) {
            targetCtx.restore();
        }

        this.ctx.restore();
    }
}

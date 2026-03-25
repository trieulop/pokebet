// Handles the visual side and sequence of battles
class BattleEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
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
        
        // Callbacks
        this.onMessage = null;
        this.onHpChange = null;
        this.onEnd = null;

        this.isRunning = false;

        // Base positions
        this.posLeft = { x: 200, y: 400 };
        this.posRight = { x: 600, y: 350 };
    }

    startBattle(leftFighter, rightFighter, callbacks) {
        this.leftFighter = leftFighter;
        this.rightFighter = rightFighter;
        
        this.leftSprite = new Sprite(leftFighter.spriteKey);
        this.leftSprite.x = this.posLeft.x;
        this.leftSprite.y = this.posLeft.y;
        this.leftSprite.flipX = false;
        this.leftSprite.scale = 2.5;

        this.rightSprite = new Sprite(rightFighter.spriteKey);
        this.rightSprite.x = this.posRight.x;
        this.rightSprite.y = this.posRight.y;
        this.rightSprite.flipX = true; // Face left
        this.rightSprite.scale = 2.5;

        this.onMessage = callbacks.onMessage;
        this.onHpChange = callbacks.onHpChange;
        this.onEnd = callbacks.onEnd;

        this.particleSystem.clear();
        this.isRunning = true;
        this.cameraObj = { x: 0, y: 0, zoom: 1 };

        // Initial HP Update
        this.onHpChange('left', this.leftFighter.hp, this.leftFighter.maxHp);
        this.onHpChange('right', this.rightFighter.hp, this.rightFighter.maxHp);

        // Start BGM
        if (typeof AudioSystem !== 'undefined') AudioSystem.playBattleMusic();

        // Start battle loop asynchronously
        setTimeout(() => this.battleLoopTick(), 1000);
    }

    stop() {
        this.isRunning = false;
    }

    // Helper to pause execution
    wait(ms) {
        return new Promise(res => setTimeout(res, ms));
    }

    // Helper to tween a property on an object
    tween(obj, prop, target, durationMs) {
        return new Promise(res => {
            let start = obj[prop];
            let diff = target - start;
            let startTime = performance.now();
            let step = (time) => {
                let elapsed = time - startTime;
                let t = elapsed / durationMs;
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
        
        let first = this.leftFighter;
        let second = this.rightFighter;
        let firstSide = 'left';
        let secondSide = 'right';

        if(rSpeed > lSpeed) {
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
        setTimeout(() => this.battleLoopTick(), 500);
    }

    async executeTurn(attacker, defender, attackerSide, defenderSide) {
        // Tick cooldowns
        attacker.skills.forEach(s => s.tickCooldown());

        // Select skill
        let skill = AIController.chooseSkill(attacker, defender);
        skill.use();

        this.onMessage(`${attacker.name} の ${skill.name}！`);
        if (typeof AudioSystem !== 'undefined') AudioSystem.speakSkill(skill.name);
        
        let attackerSprite = attackerSide === 'left' ? this.leftSprite : this.rightSprite;
        let defenderSprite = defenderSide === 'left' ? this.leftSprite : this.rightSprite;
        let startX = attackerSprite.x;

        // Timeline: Move forward
        let forwardDist = attackerSide === 'left' ? 50 : -50;
        await this.tween(attackerSprite, 'x', startX + forwardDist, 200);

        // Timeline: Attack animation
        attackerSprite.play('attack');
        
        // Camera Zoom to action
        this.tween(this.cameraObj, 'zoom', 1.1, 200);
        this.tween(this.cameraObj, 'x', attackerSide === 'left' ? 50 : -50, 200);

        await this.wait(400); // Wait for hit frame roughly

        if(skill.type === 'heal') {
            let amount = attacker.heal(40);
            this.onHpChange(attackerSide, attacker.hp, attacker.maxHp);
            this.particleSystem.addFloatingText(attackerSprite.x, attackerSprite.y - 50, `+${amount}`, '#06d6a0', 30);
            this.particleSystem.addHitEffect(attackerSprite.x, attackerSprite.y, '#06d6a0', 20);
            this.onMessage(`${attacker.name} はHPを回復した！`);
        } 
        else if (skill.type === 'buff') {
            attacker.def += 10;
            this.particleSystem.addFloatingText(attackerSprite.x, attackerSprite.y - 50, `防御アップ`, '#457b9d', 24);
            this.particleSystem.addHitEffect(attackerSprite.x, attackerSprite.y, '#457b9d', 20);
        }
        else {
            // Attack!
            // Calculate Damage slightly randomized
            let baseDmg = (attacker.atk * skill.power) / 50;
            baseDmg = baseDmg / 5; // Reduced by 5x to prolong battle
            let actualDmg = defender.takeDamage(baseDmg * (0.8 + Math.random()*0.4));
            this.onHpChange(defenderSide, defender.hp, defender.maxHp);

            // Impact Effects
            this.shakeCamera(10, 10);
            defenderSprite.play('hit');
            defenderSprite.flashWhite = true;
            this.particleSystem.addHitEffect(defenderSprite.x, defenderSprite.y, skill.effectAnim, 30);
            this.particleSystem.addFloatingText(defenderSprite.x, defenderSprite.y - 50, `-${actualDmg}`, '#e63946', 32);

            await this.wait(200);
            defenderSprite.flashWhite = false;
        }

        await this.wait(400);

        // Timeline: Return
        this.tween(attackerSprite, 'x', startX, 300);
        this.tween(this.cameraObj, 'zoom', 1.0, 300);
        this.tween(this.cameraObj, 'x', 0, 300);
        
        await this.wait(500);

        if(!defender.isAlive()) {
            defenderSprite.play('faint');
            await this.wait(1000);
        }
    }

    endBattle() {
        this.isRunning = false;
        if (typeof AudioSystem !== 'undefined') AudioSystem.stopBattleMusic();
        let winnerSide = this.leftFighter.isAlive() ? 'left' : 'right';
        this.onEnd(winnerSide);
    }

    render() {
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

        // Draw Arena Background
        let bgImg = AssetGenerator.get('bg_arena');
        if(bgImg) {
            this.ctx.drawImage(bgImg, 0, 0);
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

        // Draw Sprites
        // Y sort to draw bottom first (depth)
        let sprites = [];
        if(this.leftSprite) sprites.push(this.leftSprite);
        if(this.rightSprite) sprites.push(this.rightSprite);
        sprites.sort((a,b) => a.y - b.y);

        sprites.forEach(s => {
            s.update();
            s.draw(this.ctx);
        });

        // Draw Foreground Particles
        this.particleSystem.update();
        this.particleSystem.draw(this.ctx);

        this.ctx.restore();
    }
}

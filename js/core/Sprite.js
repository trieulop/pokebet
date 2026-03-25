// Core Sprite Class for handling frame-based animation rendering

class Sprite {
    constructor(imageKey, frameWidth = 64, frameHeight = 64) {
        this.imageKey = imageKey; // string key for AssetGenerator
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        
        // Define animations: { row: yIndex, frames: count, speed: ticksPerFrame }
        this.animations = {
            'idle': { row: 0, frames: 4, speed: 10 },
            'attack': { row: 1, frames: 4, speed: 5 },
            'hit': { row: 2, frames: 1, speed: 1 },
            'faint': { row: 3, frames: 1, speed: 1 }
        };

        this.currentAnim = 'idle';
        this.currentFrame = 0;
        this.tickCount = 0;
        this.scale = 2; // Default scale up
        this.alpha = 1;

        // Position on canvas
        this.x = 0;
        this.y = 0;
        
        // Visual effects
        this.flipX = false;
        this.flashWhite = false;
    }

    play(animName) {
        if(this.animations[animName] && this.currentAnim !== animName) {
            this.currentAnim = animName;
            this.currentFrame = 0;
            this.tickCount = 0;
        }
    }

    reset() {
        this.play('idle');
        this.alpha = 1;
        this.flashWhite = false;
    }

    update() {
        if(this.imageKey && this.imageKey.startsWith('api_')) {
             this.tickCount++;
             if(this.currentAnim === 'attack' && this.tickCount > 20) {
                 this.play('idle');
             } else if (this.currentAnim === 'hit' && this.tickCount > 10) {
                 this.play('idle');
             }
             return;
        }

        let anim = this.animations[this.currentAnim];
        this.tickCount++;

        if(this.tickCount >= anim.speed) {
            this.tickCount = 0;
            this.currentFrame++;
            if(this.currentFrame >= anim.frames) {
                // Determine loop behavior. Attack typically returns to idle.
                if(this.currentAnim === 'attack' || this.currentAnim === 'hit') {
                    this.play('idle');
                } else if(this.currentAnim === 'faint') {
                    this.currentFrame = 0; // Stays fainted
                } else {
                    this.currentFrame = 0; // Loop idle
                }
            }
        }
    }

    draw(ctx) {
        const img = AssetGenerator.get(this.imageKey);
        if(!img) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        ctx.translate(this.x, this.y);
        if(this.flipX) {
            ctx.scale(-1, 1);
        }

        if(this.flashWhite) {
            // Apply a simple composite operation to make it look white
            ctx.globalCompositeOperation = 'lighter';
        }

        if(this.imageKey.startsWith('api_')) {
            let fw = Math.max(img.width, 96);
            let fh = Math.max(img.height, 96);
            let dx = 0; let dy = 0; let rot = 0;
            if (this.currentAnim === 'idle') dy = Math.sin(this.tickCount * 0.1) * 3;
            else if (this.currentAnim === 'attack') dx = (this.tickCount < 10) ? 15 : 0;
            else if (this.currentAnim === 'hit') { dx = -10; ctx.globalCompositeOperation = 'lighter'; }
            else if (this.currentAnim === 'faint') { rot = Math.PI / 2; ctx.globalAlpha = 0.5; }
            
            ctx.rotate(rot);
            let drawScale = this.scale * 1.5; 
            ctx.drawImage(img, -fw*drawScale/2 + dx, -fh*drawScale/2 + dy, fw*drawScale, fh*drawScale);
        } else {
            let anim = this.animations[this.currentAnim];
            let sx = this.currentFrame * this.frameWidth;
            let sy = anim.row * this.frameHeight;
            // Draw centered
            ctx.drawImage(
                img, 
                sx, sy, this.frameWidth, this.frameHeight,
                -this.frameWidth * this.scale / 2, -this.frameHeight * this.scale / 2, 
                this.frameWidth * this.scale, this.frameHeight * this.scale
            );
        }

        ctx.restore();
    }
}

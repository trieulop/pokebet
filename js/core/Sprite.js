// Core Sprite Class for handling frame-based animation rendering

class Sprite {
    constructor(imageKey, frameWidth = 64, frameHeight = 64) {
        this.imageKey = imageKey; // string key for AssetGenerator
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.domElement = null;
        
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

    bindDOM(element, srcUrl) {
        this.domElement = element;
        if (element) {
            this.domElement.src = srcUrl;
            this.domElement.style.display = 'block';
        }
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
            let fw = img.width || 96; // 取得できない場合のみ96
            let fh = img.height || 96;
            let dx = 0; let dy = 0; let rot = 0;
            let timeMs = performance.now();
            let period = 2000;
            let progress = (timeMs % period) / period;
            let curve = (1 - Math.cos(progress * 2 * Math.PI)) / 2;
            if (this.currentAnim === 'idle') dy = -25 * curve;
            else if (this.currentAnim === 'attack') dx = (this.tickCount < 10) ? 15 : 0;
            else if (this.currentAnim === 'hit') { dx = -10; ctx.globalCompositeOperation = 'lighter'; }
            else if (this.currentAnim === 'faint') { rot = Math.PI / 2; ctx.globalAlpha = 0.5; }
            
            ctx.rotate(rot);
            let drawScale = this.scale * 1.2; // 試合中一律1.2倍拡大

            if (this.domElement) {
                let fWidth = fw * drawScale;
                let fHeight = fh * drawScale;
                
                this.domElement.style.width = fWidth + 'px';
                this.domElement.style.height = fHeight + 'px';
                
                // Position centered
                let px = this.x - fWidth/2 + dx;
                let py = this.y - fHeight/2 + dy;
                
                let scaleStr = this.flipX ? 'scaleX(-1)' : 'scaleX(1)';
                let rotateStr = rot ? `rotate(${rot}rad)` : '';
                
                this.domElement.style.transform = `translate(${px}px, ${py}px) ${scaleStr} ${rotateStr}`;
                this.domElement.style.transformOrigin = 'center center';
                
                if (this.flashWhite) {
                    this.domElement.style.filter = 'brightness(2) contrast(0) opacity(1)';
                } else if (this.currentAnim === 'faint') {
                    this.domElement.style.filter = 'drop-shadow(0 0 5px rgba(0,0,0,0.5)) opacity(0.5)';
                } else {
                    this.domElement.style.filter = 'drop-shadow(0 0 5px rgba(0,0,0,0.5)) opacity(' + this.alpha + ')';
                }
                
                ctx.restore();
                return; // SKIP CANVAS DRAW
            }

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

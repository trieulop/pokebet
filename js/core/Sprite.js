// Core Sprite Class for handling frame-based animation rendering

class Sprite {
    constructor(imageKey, frameWidth = 64, frameHeight = 64) {
        this.imageKey = imageKey; // string key for AssetGenerator
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.domElement = null;
        
        // Caches for DOM interactions to prevent layout thrashing
        this._lastW = '';
        this._lastH = '';
        this._lastLeft = '';
        this._lastTop = '';
        this._lastTransform = '';
        this._lastFilter = '';
        
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
            this.domElement.style.transformOrigin = 'center center'; // Set once
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
        this.evolutionStage = 1;
        this.playerControlled = false;

        // Visual offsets for animation alignment
        this.visualOffsetX = 0;
        this.visualOffsetY = 0;
        this.visualRotation = 0;
        this.alpha = 1;
        this.flashWhite = false;
    }

    update() {
        if(this.imageKey && this.imageKey.startsWith('api_')) {
             this.tickCount++;
             
             // Update visual offsets based on current animation
             let timeMs = performance.now();
             
             if (this.currentAnim === 'idle') {
                 let t = timeMs / 1000;
                 this.visualOffsetY = -22 * ((1 - Math.cos(t * Math.PI)) / 2);
                 this.visualOffsetX = 12 * Math.sin(t * 0.8 * Math.PI);
                 this.visualRotation = 0.08 * Math.sin(t * 0.5 * Math.PI);
             } else if (this.currentAnim === 'attack') {
                 this.visualOffsetX = (this.tickCount < 10) ? 15 : 0;
                 this.visualOffsetY = 0;
                 this.visualRotation = 0;
             } else if (this.currentAnim === 'hit') {
                 this.visualOffsetX = -10;
                 this.visualOffsetY = 0;
                 this.visualRotation = 0;
             } else if (this.currentAnim === 'faint') {
                 this.visualRotation = -Math.PI / 4;
                 // Note: dy is calculated in draw because it depends on scale/height
             } else {
                 this.visualOffsetX = 0;
                 this.visualOffsetY = 0;
                 this.visualRotation = 0;
             }

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
        // --- DOM POSITIONING (Must run even if canvas img is loading/missing) ---
        if (this.domElement) {
            let fw = 96, fh = 96;
            const img = AssetGenerator.get(this.imageKey);
            if (img) {
                fw = img.width || 96;
                fh = img.height || 96;
            }

            let dx = this.visualOffsetX; 
            let dy = this.visualOffsetY; 
            let rot = this.visualRotation;
            let drawScale = this.scale * 1.2;

            if (this.currentAnim === 'faint') {
                dy = (fh * drawScale) / 4;
            }

            let fWidth = fw * drawScale;
            let fHeight = fh * drawScale;
            
            if (this._lastW !== fWidth + 'px') { this.domElement.style.width = fWidth + 'px'; this._lastW = fWidth + 'px'; }
            if (this._lastH !== fHeight + 'px') { this.domElement.style.height = fHeight + 'px'; this._lastH = fHeight + 'px'; }
            
            // Offsets and Visuals via Transform (Translation for micro-movements dx/dy)
            let scaleStr = this.flipX ? 'scaleX(-1)' : 'scaleX(1)';
            let rotateStr = rot ? `rotate(${rot}rad)` : '';
            let newTransform = `translate(${dx}px, ${dy}px) ${scaleStr} ${rotateStr}`;
            
            if (this._lastTransform !== newTransform) {
                this.domElement.style.transform = newTransform;
                this._lastTransform = newTransform;
            }
            
            // Visual filters
            let newFilter = '';
            if (this.flashWhite) newFilter = 'brightness(2) contrast(0) opacity(1)';
            else if (this.currentAnim === 'faint') newFilter = 'drop-shadow(0 0 5px rgba(0,0,0,0.5)) opacity(0.5)';
            else newFilter = `drop-shadow(0 0 5px rgba(0,0,0,0.5)) opacity(${this.alpha})`;

            if (this._lastFilter !== newFilter) {
                this.domElement.style.filter = newFilter;
                this._lastFilter = newFilter;
            }

            // If we are using DOM, we are done with this sprite's basic drawing
            return; 
        }

        // --- CANVAS DRAWING (Standard fallback) ---
        const img = AssetGenerator.get(this.imageKey);
        if(!img) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        
        if(this.flipX) ctx.scale(-1, 1);
        if(this.flashWhite) ctx.globalCompositeOperation = 'lighter';

        if(this.imageKey.startsWith('api_')) {
            let fw = img.width || 96;
            let fh = img.height || 96;
            let drawScale = this.scale * 1.2;
            ctx.drawImage(img, -fw*drawScale/2, -fh*drawScale/2, fw*drawScale, fh*drawScale);
        } else {
            let anim = this.animations[this.currentAnim];
            let sx = this.currentFrame * this.frameWidth;
            let sy = anim.row * this.frameHeight;
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

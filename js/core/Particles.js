// Particle System for Auras, Hits, and floating texts

class Particle {
    constructor(x, y, dx, dy, life, color, size, text = null) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.text = text; // If provided, behaves as floating text
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.life--;
        // Gravity for particles
        if(!this.text) {
            this.dy += 0.2; 
        } else {
            // Floating text floats straight up slowly
            this.dy *= 0.9;
        }
    }

    draw(ctx) {
        ctx.save();
        let alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;

        if (this.text) {
            ctx.fillStyle = this.color;
            ctx.font = `bold ${this.size}px "Press Start 2P", Arial`;
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText(this.text, this.x, this.y);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.auras = []; // Continuous particles linked to a target
    }

    addHitEffect(x, y, color = '#ffd700', count = 10) {
        for(let i=0; i<count; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 5 + 2;
            let dx = Math.cos(angle) * speed;
            let dy = Math.sin(angle) * speed;
            let life = Math.floor(Math.random() * 20) + 10;
            let size = Math.random() * 4 + 2;
            this.particles.push(new Particle(x, y, dx, dy, life, color, size));
        }
    }

    addFloatingText(x, y, text, color = '#ff0000', size = 20) {
        this.particles.push(new Particle(x, y, 0, -2, 40, color, size, text));
    }

    // Call continuously for rare/epic/legendary characters
    emitAura(x, y, color) {
        if(Math.random() < 0.3) {
            this.particles.push(new Particle(
                x + (Math.random()*40 - 20), 
                y + 30, 
                0, -Math.random()*2 - 1, 
                30, color, Math.random()*3 + 1
            ));
        }
    }

    update() {
        for(let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            if(p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for(let p of this.particles) {
            p.draw(ctx);
        }
    }
    
    clear() {
        this.particles = [];
    }
}

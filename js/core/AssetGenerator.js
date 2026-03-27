// Dynamic Asset Generator for making sprite sheets programmatically
// This avoids needing external images and ensures it runs instantly in the browser.

class AssetGenerator {
    static sprites = {};

    static init() {
        // Generate sprite sheets for different dummy pokemon and items
        this.sprites['slime_blue'] = this.createCreatureSprite('#4cc9f0');
        this.sprites['slime_red'] = this.createCreatureSprite('#e63946');
        this.sprites['slime_green'] = this.createCreatureSprite('#06d6a0');
        this.sprites['slime_gold'] = this.createCreatureSprite('#ffd700');
        this.sprites['bg_arena'] = this.createGameBackground();
    }

    // Creates an image returning 4 frames (idle), 4 frames (attack), 1 frame (hit), 1 frame (faint)
    // Frame size: 64x64, Layout: Rows for animations
    static createCreatureSprite(baseColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 64 * 4;   // Max 4 frames per animation
        canvas.height = 64 * 4; // 4 animations (idle, attack, hit, faint)
        const ctx = canvas.getContext('2d');

        const drawSlime = (x, y, scaleY = 1, offsetX = 0, color = baseColor) => {
            ctx.save();
            ctx.translate(x + 32, y + 64); // Bottom center
            
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(offsetX, -4, 20, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(offsetX, -20 * scaleY, 24, 20 * scaleY, 0, 0, Math.PI * 2);
            ctx.fill();

            // Highlights
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.ellipse(offsetX - 8, -28 * scaleY, 8, 4 * scaleY, 0, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(offsetX - 10, -15 * scaleY, 3, 0, Math.PI * 2);
            ctx.arc(offsetX + 10, -15 * scaleY, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        // Row 0: Idle (4 frames)
        for(let i=0; i<4; i++) {
            let squash = 1 + Math.sin(i * Math.PI / 2) * 0.1;
            drawSlime(i * 64, 0, squash);
        }

        // Row 1: Attack (4 frames)
        for(let i=0; i<4; i++) {
            let forward = (i == 1 || i == 2) ? 15 : 0;
            let squash = (i == 1) ? 0.8 : (i == 2 ? 1.2 : 1);
            drawSlime(i * 64, 64, squash, forward);
        }

        // Row 2: Hit (1 frame)
        drawSlime(0, 128, 0.8, -10, '#fff'); // Flash white slightly and pushed back

        // Row 3: Faint (1 frame)
        ctx.save();
        ctx.translate(32, 192 + 64);
        ctx.fillStyle = '#555'; // Grayed out
        ctx.beginPath();
        ctx.ellipse(0, -10, 30, 10, 0, 0, Math.PI * 2); // Flattened
        ctx.fill();
        ctx.fillStyle = '#000'; // Dead eyes X
        ctx.font = '10px Arial';
        ctx.fillText('X X', -8, -5);
        ctx.restore();

        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        return img;
    }

    static createGameBackground(w = 800, h = 600) {
        const pad = 200; // Extra padding to hide borders during screen shake/move
        const totalW = w + pad;
        const totalH = h + pad;

        const canvas = document.createElement('canvas');
        canvas.width = totalW;
        canvas.height = totalH;
        const ctx = canvas.getContext('2d');

        // Sky
        let grad = ctx.createLinearGradient(0, 0, 0, totalH);
        grad.addColorStop(0, '#1d3557');
        grad.addColorStop(1, '#457b9d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, totalW, totalH);

        // Ground / Arena
        ctx.fillStyle = '#2a9d8f';
        ctx.beginPath();
        ctx.ellipse(totalW / 2, totalH * 0.75, totalW * 0.6, totalH * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Arena border
        ctx.strokeStyle = '#264653';
        ctx.lineWidth = 10;
        ctx.stroke();

        // Details
        ctx.fillStyle = '#21867a';
        for(let i=0; i<50; i++) {
            ctx.beginPath();
            let x = Math.random() * totalW;
            let y = (totalH * 0.6) + (Math.random() * (totalH * 0.4));
            ctx.ellipse(x, y, 10 + Math.random()*20, 5 + Math.random()*5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        return img;
    }

    static get(name) {
        return this.sprites[name];
    }
}

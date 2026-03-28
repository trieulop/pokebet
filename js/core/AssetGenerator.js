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
        this.sprites['bg_train'] = this.createTrainBackground();
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

    static createTrainBackground(w = 800, h = 600) {
        const pad = 200;
        const TW = w + pad;
        const TH = h + pad;
        const canvas = document.createElement('canvas');
        canvas.width  = TW;
        canvas.height = TH;
        const ctx = canvas.getContext('2d');
        const HZ = TH * 0.50; // horizon

        // ━━━ SKY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        let skyG = ctx.createLinearGradient(0, 0, 0, HZ);
        skyG.addColorStop(0,   '#2E9FD8');
        skyG.addColorStop(0.6, '#5DBEE8');
        skyG.addColorStop(1,   '#A8DCF0');
        ctx.fillStyle = skyG;
        ctx.fillRect(0, 0, TW, HZ);

        // ━━━ CLOUDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const cloud = (cx, cy, r) => {
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            [[0,0,1],[r*.7,r*.1,.75],[-r*.6,r*.1,.7],[r*.3,-r*.5,.6],[-r*.25,-r*.45,.55]].forEach(([dx,dy,rr]) => {
                ctx.beginPath(); ctx.arc(cx+dx, cy+dy, r*rr, 0, Math.PI*2); ctx.fill();
            });
        };
        cloud(TW*0.55, HZ*0.22, 36);
        cloud(TW*0.75, HZ*0.16, 26);
        cloud(TW*0.30, HZ*0.28, 20);

        // ━━━ DISTANT HILLS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const hill = (color, pts) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, HZ);
            pts.forEach(([x,y]) => ctx.lineTo(x, y));
            ctx.lineTo(TW, HZ);
            ctx.closePath();
            ctx.fill();
        };
        hill('#4A9E3F', [[0,HZ*.74],[TW*.10,HZ*.60],[TW*.22,HZ*.70],[TW*.35,HZ*.55],[TW*.65,HZ*.52],[TW,HZ*.68]]);
        hill('#5FC050', [[0,HZ*.85],[TW*.15,HZ*.74],[TW*.45,HZ*.70],[TW*.78,HZ*.72],[TW,HZ*.76]]);

        // ━━━ SOLID GROUND (Base layer to prevent black gaps) ━━━
        let gndG = ctx.createLinearGradient(0, HZ, 0, TH);
        gndG.addColorStop(0, '#4DB040');
        gndG.addColorStop(1, '#1E5C15');
        ctx.fillStyle = gndG;
        ctx.fillRect(0, HZ, TW, TH - HZ);

        // ━━━ DIRT PATH (Center road) ━━━━━━━━━━━━━━━━━━━━━━
        const pTop = HZ + (TH - HZ) * 0.15;
        const pBot = TH + 10;
        ctx.beginPath();
        ctx.moveTo(TW*0.44, pTop);
        ctx.lineTo(TW*0.56, pTop);
        ctx.lineTo(TW*0.90, pBot);
        ctx.lineTo(TW*0.10, pBot);
        ctx.closePath();
        let pathG = ctx.createLinearGradient(0, pTop, 0, pBot);
        pathG.addColorStop(0, '#D4BB8E');
        pathG.addColorStop(1, '#A88450');
        ctx.fillStyle = pathG;
        ctx.fill();

        // ━━━ TROPICAL TREES (Better implementation) ━━━━━━━
        const drawTree = (tx, ty, scale) => {
            const tH = 80 * scale;
            const tW = 14 * scale;
            const cR = 45 * scale;

            // Trunk (wider and textured)
            ctx.fillStyle = '#6B4226';
            ctx.beginPath();
            ctx.moveTo(tx - tW/2, ty);
            ctx.lineTo(tx + tW/2, ty);
            ctx.lineTo(tx + tW/3, ty - tH);
            ctx.lineTo(tx - tW/3, ty - tH);
            ctx.closePath();
            ctx.fill();

            // Canopy (Overlap circles for a lush look)
            const cy = ty - tH;
            const drawLobe = (lx, ly, lr, color) => {
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI*2); ctx.fill();
            };
            
            drawLobe(tx, cy, cR, '#1E6618'); // Shadow/Back
            drawLobe(tx - cR*0.4, cy - cR*0.2, cR*0.8, '#3DA030'); // Left
            drawLobe(tx + cR*0.4, cy - cR*0.1, cR*0.75, '#4AAE38'); // Right
            drawLobe(tx, cy - cR*0.4, cR*0.7, '#70CC55'); // Top/Center
            
            // Highlights
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath(); ctx.arc(tx - cR*0.2, cy - cR*0.3, cR*0.3, 0, Math.PI*2); ctx.fill();
        };

        // Distribution of trees
        drawTree(TW*0.15, HZ + 20, 0.6);
        drawTree(TW*0.28, HZ + 15, 1.0); // 0.5 -> 1.0 (2x)
        drawTree(TW*0.72, HZ + 15, 1.1); // 0.55 -> 1.1 (2x)
        drawTree(TW*0.85, HZ + 25, 0.75);
        // Foreground trees
        drawTree(TW*0.05, TH*0.8, 1.4);
        drawTree(TW*0.92, TH*0.75, 1.2);

        // ━━━ GRASS TUFTS (Foreground detail) ━━━━━━━━━━━━━━
        for (let i = 0; i < 150; i++) {
            const gx = Math.random() * TW;
            const gy = pTop + Math.random() * (TH - pTop);
            const gh = 6 + Math.random() * 10;
            ctx.strokeStyle = `rgba(30, 90, 20, ${0.3 + Math.random()*0.4})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + (Math.random()-0.5)*8, gy - gh);
            ctx.stroke();
        }

        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        return img;
    }



    static get(name) {
        return this.sprites[name];
    }
}

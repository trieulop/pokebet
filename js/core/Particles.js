// Particle System for Auras, Hits, and floating texts

class Particle {
    constructor(x, y, dx, dy, life, color, size, text = null, type = 'circle') {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.text = text; // If provided, behaves as floating text
        this.type = type; // 'circle', 'rect', 'line', 'beam', 'cross'
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.2;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.life--;
        this.angle += this.spin;
        // Gravity for physical particles
        if(!this.text) {
            const noGravityTypes = ['line', 'beam', 'cross', 'slash', 'lightning', 'thunderbolt', 'starburst', 'megabeam', 'daimonji', 'waterbeam', 'ring'];
            if (!noGravityTypes.includes(this.type)) {
                this.dy += 0.2; 
            }
        } else {
            // Floating text floats straight up slowly
            this.dy *= 0.9;
        }
    }

    draw(ctx) {
        ctx.save();
        let alpha = this.life / this.maxLife;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha)); // Safety clamp

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
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = this.color;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = Math.max(1.5, this.size * 0.2); // Ensure visible lines
            
            // Use source-over for better visibility on transparent canvas
            ctx.globalCompositeOperation = 'source-over'; 

            if (this.type === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2); // Slightly larger
                ctx.fill();
            } else if (this.type === 'rect') {
                ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
            } else if (this.type === 'line') {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                let len = this.size * 4;
                let vl = Math.sqrt(this.dx*this.dx + this.dy*this.dy);
                if (vl > 0) {
                    ctx.lineTo((this.dx / vl) * len, (this.dy / vl) * len);
                } else {
                    ctx.lineTo(len, 0);
                }
                ctx.stroke();
            } else if (this.type === 'beam') {
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 10;
                ctx.fillRect(-this.size, -this.size/2, this.size*2, this.size);
            } else if (this.type === 'cross') {
                ctx.fillRect(-this.size/2, -this.size/6, this.size, this.size/3);
                ctx.fillRect(-this.size/6, -this.size/2, this.size/3, this.size);
            } else if (this.type === 'slash') {
                let width = this.size * 12;  // EXTRA Long width
                let thickness = this.size * 0.4; 
                ctx.beginPath();
                ctx.moveTo(-width/2, 0);
                ctx.lineTo(0, -thickness/2);
                ctx.lineTo(width/2, 0);
                ctx.lineTo(0, thickness/2);
                ctx.closePath();
                ctx.fill();
            } else if (this.type === 'lightning') {
                // Outer glow
                ctx.beginPath();
                ctx.moveTo(0, -this.size * 12);
                ctx.lineTo(this.size * 1.0, -this.size * 4);
                ctx.lineTo(-this.size * 1.0, 0);
                ctx.lineTo(this.size * 0.5, this.size * 12);
                ctx.lineWidth = this.size * 0.4;
                ctx.lineJoin = 'miter';
                ctx.stroke();

                // Inner bright core
                ctx.beginPath();
                ctx.moveTo(0, -this.size * 12);
                ctx.lineTo(this.size * 1.0, -this.size * 4);
                ctx.lineTo(-this.size * 1.0, 0);
                ctx.lineTo(this.size * 0.5, this.size * 12);
                ctx.lineWidth = this.size * 0.1;
                ctx.strokeStyle = '#fff';
                ctx.stroke();
            } else if (this.type === 'thunderbolt') {
                let length = this.size * 12; // Length outwards
                
                // Outer glow
                ctx.beginPath();
                ctx.moveTo(0, 0); // start at center
                ctx.lineTo(length * 0.3, -this.size * 1.5);
                ctx.lineTo(length * 0.7, this.size * 1.5);
                ctx.lineTo(length, -this.size * 0.5);
                ctx.lineWidth = this.size * 0.4;
                ctx.lineJoin = 'miter';
                ctx.stroke();

                // Inner core
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(length * 0.3, -this.size * 1.5);
                ctx.lineTo(length * 0.7, this.size * 1.5);
                ctx.lineTo(length, -this.size * 0.5);
                ctx.lineWidth = this.size * 0.1;
                ctx.strokeStyle = '#fff';
                ctx.stroke();
            } else if (this.type === 'starburst') {
                // Draw a jagged star
                ctx.beginPath();
                let spikes = 8; // 8-point star
                for (let i = 0; i < spikes * 2; i++) {
                    // alternate inner and outer radius
                    let r = (i % 2 === 0) ? this.size * 4 : this.size * 1.5;
                    let a = (Math.PI * 2 / (spikes * 2)) * i;
                    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                }
                ctx.closePath();
                ctx.fillStyle = this.color;
                ctx.fill();
            } else if (this.type === 'daimonji') {
                let s = this.size; // scale
                
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                // Draw function for the "大" shape (width narrowed by ~1.2x)
                const drawDai = () => {
                    ctx.beginPath();
                    // Horizontal stroke (left to right)
                    ctx.moveTo(-s * 1.65, -s * 0.5);
                    ctx.lineTo(s * 1.65, -s * 0.5);
                    // Vertical center curve (top down bending leftish)
                    ctx.moveTo(0, -s * 2.5);
                    ctx.quadraticCurveTo(0, s * 0.5, -s * 1.25, s * 2);
                    // Right leg
                    ctx.moveTo(0, -s * 0.5);
                    ctx.quadraticCurveTo(s * 0.65, s * 0.5, s * 1.25, s * 2);
                };

                // Outer red glow
                drawDai();
                ctx.lineWidth = s * 1.5;
                ctx.strokeStyle = '#e63946'; 
                ctx.stroke();

                // Orange mid glow
                drawDai();
                ctx.lineWidth = s * 0.8;
                ctx.strokeStyle = '#ffb703';
                ctx.stroke();

                // Yellow/White core
                drawDai();
                ctx.lineWidth = s * 0.3;
                ctx.strokeStyle = '#fff';
                ctx.stroke();
            } else if (this.type === 'megabeam') {
                // Draws forward from origin (0,0) towards the target's visual center.
                // Rotation is already applied by Particle.draw() based on this.angle.
                let startX = 0; 
                let endX = 1500; 
                
                let size = this.size;
                
                // Yellow outer glow
                ctx.beginPath();
                ctx.moveTo(startX, -size * 1.5);
                ctx.lineTo(endX, -size * 2.5);
                ctx.lineTo(endX, size * 2.5);
                ctx.lineTo(startX, size * 1.5);
                ctx.fillStyle = '#d4d700';
                ctx.fill();

                // Green/Yellow mid glow
                ctx.beginPath();
                ctx.moveTo(startX, -size * 1.0);
                ctx.lineTo(endX, -size * 1.5);
                ctx.lineTo(endX, size * 1.5);
                ctx.lineTo(startX, size * 1.0);
                ctx.fillStyle = '#a8e639';
                ctx.fill();
                
                // White core
                ctx.beginPath();
                ctx.moveTo(startX, -size * 0.4);
                ctx.lineTo(endX, -size * 0.8);
                ctx.lineTo(endX, size * 0.8);
                ctx.lineTo(startX, size * 0.4);
                ctx.fillStyle = '#ffffff'; 
                ctx.fill();
            } else if (this.type === 'waterbeam') {
                let startX = 0; 
                let endX = 1500; 
                let size = this.size;
                
                // Deep blue outer glow
                ctx.beginPath();
                ctx.moveTo(startX, -size * 1.5);
                ctx.lineTo(endX, -size * 2.5);
                ctx.lineTo(endX, size * 2.5);
                ctx.lineTo(startX, size * 1.5);
                ctx.fillStyle = '#0077b6'; 
                ctx.fill();

                // Cyan mid glow
                ctx.beginPath();
                ctx.moveTo(startX, -size * 1.0);
                ctx.lineTo(endX, -size * 1.5);
                ctx.lineTo(endX, size * 1.5);
                ctx.lineTo(startX, size * 1.0);
                ctx.fillStyle = '#4cc9f0'; 
                ctx.fill();
                
                // White/Lightblue core
                ctx.beginPath();
                ctx.moveTo(startX, -size * 0.4);
                ctx.lineTo(endX, -size * 0.8);
                ctx.lineTo(endX, size * 0.8);
                ctx.lineTo(startX, size * 0.4);
                ctx.fillStyle = '#e0fbfc'; 
                ctx.fill();
            } else if (this.type === 'ring') {
                let progress = 1 - (this.life / this.maxLife); // 0 to 1
                let currentScale = this.size * progress;
                ctx.beginPath();
                // Vertical ellipse representing a water ring propagating forward
                ctx.ellipse(0, 0, currentScale * 0.4, currentScale, 0, 0, Math.PI * 2);
                ctx.lineWidth = Math.max(0.5, 6 * (this.life / this.maxLife));
                ctx.strokeStyle = this.color;
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.auras = []; // Continuous particles linked to a target
    }

    addHitEffect(x, y, color = '#ffd700', count = 12) {
        for(let i=0; i<count; i++) {
            let dx = (Math.random() - 0.5) * 8; 
            let dy = (Math.random() - 0.5) * 8;
            let life = Math.floor(Math.random() * 20) + 10;
            let size = Math.random() * 4 + 2; 
            this.particles.push(new Particle(x, y, dx, dy, life, color, size, null, 'circle'));
        }
    }

    addSkillEffect(skillId, x, y, side, sourceX = x, sourceY = y, skillName = '') {
        // Defensive checks for invalid coordinates
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) {
            sourceX = x;
            sourceY = y;
        }

        // Normalization mapping for PokeAPI skill IDs to internal animation keys
        const mapping = {
            'だいもんじ': 'fireblast',
            'fire-blast': 'fireblast',
            'flamethrower': 'fireblast',
            'fire-punch': 'fireblast',
            'ember': 'fireblast',
            'ハイドロポンプ': 'hydropump',
            'hydro-pump': 'hydropump',
            'water-gun': 'hydropump',
            'bubble-beam': 'hydropump',
            'surf': 'hydropump',
            'ソーラービーム': 'solarbeam',
            'solar-beam': 'solarbeam',
            'razor-leaf': 'solarbeam',
            'vine-whip': 'solarbeam',
            'leaf-blade': 'solarbeam',
            'でんこうせっか': 'quickattack',
            'quick-attack': 'quickattack',
            '10まんボルト': 'thunderbolt',
            'かみなり': 'lightning',
            'thunderbolt': 'thunderbolt',
            'thunder': 'lightning',
            'spark': 'quickattack',
            'じこさいせい': 'heal',
            'recover': 'heal',
            'soft-boiled': 'heal',
            'milk-drink': 'heal',
            'まもる': 'shield',
            'protect': 'shield',
            'detect': 'shield',
            'サイケこうせん': 'starburst',
            'psybeam': 'starburst',
            'confusion': 'starburst',
            'psychic': 'starburst',
            'dazzling-gleam': 'starburst',
            'moonblast': 'starburst',
            'たいあたり': 'tackle',
            'はたく': 'tackle',
            'ひっかく': 'tackle',
            'tackle': 'tackle',
            'pound': 'tackle',
            'scratch': 'tackle',
            'slam': 'tackle',
            'cut': 'tackle'
        };
        
        // Normalize: remove dashes, lower case, use mapping
        const normalized = skillId?.toString().toLowerCase().replace(/-/g, '') || 'tackle';
        let internalId = mapping[skillId] || mapping[normalized] || normalized;

        // --- NAME-BASED FALLBACK (for PokeAPI diversity & Japanese names) ---
        if (!mapping[internalId]) {
            const lowName = (skillName || '').toLowerCase();
            if (lowName.includes('fire') || lowName.includes('火') || lowName.includes('焔') || lowName.includes('炎')) internalId = 'fireblast';
            else if (lowName.includes('water') || lowName.includes('水') || lowName.includes('泡')) internalId = 'hydropump';
            else if (lowName.includes('leaf') || lowName.includes('草') || lowName.includes('花') || lowName.includes('葉') || lowName.includes('カッター')) internalId = 'solarbeam';
            else if (lowName.includes('bolt') || lowName.includes('雷') || lowName.includes('電') || lowName.includes('光') || lowName.includes('100まん')) internalId = 'lightning';
            else if (lowName.includes('beam') || lowName.includes('光線') || lowName.includes('ビーム') || lowName.includes('びーむ')) internalId = 'solarbeam';
            else if (lowName.includes('heal') || lowName.includes('回復') || lowName.includes('治') || lowName.includes('さいせい')) internalId = 'heal';
            else if (lowName.includes('punch') || lowName.includes('パンチ') || lowName.includes('kick') || lowName.includes('キック') || lowName.includes('ずつき') || lowName.includes('あたる')) internalId = 'tackle';
        }
        
        let count = 0;
        let dirX = side === 'left' ? 1 : -1; // 1 means moving from left to right

        switch(internalId) {
            case 'tackle':
            case 'pound':
            case 'scratch':
            case 'slam':
                count = 12; // Increased from 1 for visibility
                for(let i=0; i<count; i++) {
                    let life = Math.floor(Math.random() * 8) + 12;
                    let size = Math.random() * 15 + 25; // larger base size
                    let color = '#fff';
                    // Spread it around the impact 
                    let px = x + (Math.random() - 0.5) * 60;
                    let py = y + (Math.random() - 0.5) * 60;
                    let p = new Particle(px, py, (Math.random()-0.5)*5, (Math.random()-0.5)*5, life, color, size, null, 'slash');
                    p.angle = (Math.random() * Math.PI * 2); 
                    p.spin = (Math.random() - 0.5) * 0.2;
                    this.particles.push(p);
                }
                break;
            case 'fireblast':
                // 1. The giant "大" character in the center 
                let pDai = new Particle(x, y - 40, 0, 0, 40, '#ffb703', 35, null, 'daimonji');
                pDai.spin = 0; // lock rotation
                this.particles.push(pDai);

                // 2. Huge fire explosion particles bursting from the bottom
                count = 45;
                for(let i=0; i<count; i++) {
                    let speed = Math.random() * 10 + 2;
                    let angle = (Math.random() - 0.5) * Math.PI - Math.PI/2;
                    // Spread particles widely around the "大" base
                    let pX = x + (Math.random() - 0.5) * 140;
                    let pY = y + (Math.random() - 0.5) * 60;
                    
                    let dx = Math.cos(angle) * speed;
                    // Fire floats up
                    let dy = Math.sin(angle) * speed - 2; 
                    let life = Math.floor(Math.random() * 25) + 15;
                    let size = Math.random() * 15 + 8; // Large flame chunks
                    let color = Math.random() > 0.4 ? '#e63946' : (Math.random() > 0.6 ? '#ffb703' : '#fff');
                    this.particles.push(new Particle(pX, pY, dx, dy, life, color, size, null, 'circle'));
                }
                break;
            case 'quickattack':
            case 'thunderbolt':
                // 1. Central starburst flash behind/on the target
                let pFlash = new Particle(x, y, 0, 0, 15, '#ffde00', 30, null, 'starburst');
                pFlash.spin = 0;
                this.particles.push(pFlash);

                // 2. Radiating zigzag thunderbolts
                count = (internalId === 'thunderbolt') ? 10 : 6; // More bolts for real Thunderbolt
                for(let i=0; i<count; i++) {
                    let life = Math.floor(Math.random() * 5) + 12; 
                    let size = (Math.random() * 4 + 8) * (internalId === 'thunderbolt' ? 2 : 1.5); 
                    
                    let p = new Particle(x, y, 0, 0, life, '#ffde00', size, null, 'thunderbolt');
                    p.angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
                    p.spin = 0;
                    this.particles.push(p);
                    
                    let sSpeed = Math.random() * 15 + 10;
                    let sDx = Math.cos(p.angle) * sSpeed;
                    let sDy = Math.sin(p.angle) * sSpeed;
                    let sLife = Math.floor(Math.random() * 10) + 10;
                    let sSize = Math.random() * 5 + 3;
                    this.particles.push(new Particle(x, y, sDx, sDy, sLife, '#ffffff', sSize, null, 'line'));
                }
                break;
            case 'lightning':
                // Single massive vertical bolt
                let pBolt = new Particle(x, y - 50, 0, 0, 20, '#fff', 5, null, 'lightning');
                pBolt.spin = 0;
                this.particles.push(pBolt);
                
                // Ground flash
                this.particles.push(new Particle(x, y, 0, 0, 10, '#fff', 40, null, 'starburst'));
                
                // Electric sparks around impact
                for(let i=0; i<20; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let speed = Math.random() * 10 + 5;
                    this.particles.push(new Particle(x, y, Math.cos(angle)*speed, Math.sin(angle)*speed, 15, '#ffde00', 2, null, 'circle'));
                }
                break;
            case 'hydropump':
                let hBeamY = sourceY - 40;
                let hStartOffX = dirX * 30; // offset slightly in front
                let hAngle = Math.atan2(y - 40 - hBeamY, x - (sourceX + hStartOffX));
                let pBeam = new Particle(sourceX + hStartOffX, hBeamY, dirX, 0, 25, '#4cc9f0', 25, null, 'waterbeam');
                pBeam.angle = hAngle; 
                pBeam.spin = 0;
                this.particles.push(pBeam);

                // Add expanding rapid water rings around the origin
                for(let i=0; i<6; i++) {
                    let rLife = 10 + i * 3;
                    let rX = sourceX + hStartOffX + dirX * (Math.random() * 50);
                    let r = new Particle(rX, hBeamY, dirX * 15, 0, rLife, '#e0fbfc', Math.random()*40 + 60, null, 'ring');
                    r.angle = 0; 
                    r.spin = 0;
                    this.particles.push(r);
                }

                // Rapidly flying water droplets/sparks along the beam
                count = 30;
                for(let i=0; i<count; i++) {
                    let speed = Math.random() * 25 + 15;
                    // Flying generally super fast forward
                    let angle = hAngle + (Math.random() - 0.5) * 0.3;
                    let dx = Math.cos(angle) * speed;
                    let dy = Math.sin(angle) * speed;
                    let life = Math.floor(Math.random() * 15) + 10;
                    let size = Math.random() * 4 + 2;
                    let color = Math.random() > 0.4 ? '#4cc9f0' : '#ffffff';
                    let pd = new Particle(sourceX + hStartOffX + (Math.random() * 80 * dirX), hBeamY + (Math.random()-0.5)*40, dx, dy, life, color, size, null, 'line');
                    pd.angle = angle; 
                    pd.spin = 0;
                    this.particles.push(pd);
                }
                break;
            case 'solarbeam':
                count = 1;
                let beamY = sourceY - 40; // aim roughly at the center of attacker
                let startOffset = dirX * 30; // slightly in front of attacker
                let targetAng = Math.atan2(y - 40 - beamY, x - (sourceX + startOffset));
                for(let i=0; i<count; i++) {
                    let life = 30; 
                    let size = 35; 
                    // Spawn particle EXACTLY at attacker's visual position
                    let p = new Particle(sourceX + startOffset, beamY, dirX, 0, life, '#fff', size, null, 'megabeam');
                    p.angle = targetAng;
                    p.spin = 0;
                    this.particles.push(p);
                }
                
                // Add some exploding leaves/energy around the IMPACT point (x, y)
                let sHitY = y - 40;
                for(let i=0; i<35; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let speed = Math.random() * 15 + 5;
                    let dx = Math.cos(angle) * speed;
                    let dy = Math.sin(angle) * speed;
                    let life = Math.floor(Math.random() * 30) + 15;
                    let size = Math.random() * 5 + 3;
                    
                    if (Math.random() > 0.6) {
                        // Leaf particle
                        let leaf = new Particle(x, sHitY, dx, dy, life, '#2d6a4f', size*1.5, null, 'slash');
                        leaf.angle = Math.random() * Math.PI * 2;
                        leaf.spin = (Math.random() - 0.5) * 0.4; // spinning leaf
                        this.particles.push(leaf);
                    } else {
                        // Yellow/white light spark
                        let color = Math.random() > 0.6 ? '#ffffff' : '#d4d700';
                        this.particles.push(new Particle(x, sHitY, dx, dy, life, color, size, null, 'circle'));
                    }
                }
                break;
            case 'heal':
                count = 10;
                for(let i=0; i<count; i++) {
                    let dx = (Math.random() - 0.5) * 3;
                    let dy = -Math.random() * 5 - 2;
                    let life = Math.floor(Math.random() * 40) + 20;
                    let size = Math.random() * 10 + 5;
                    this.particles.push(new Particle(x + (Math.random()*80-40), y + (Math.random()*60-10), dx, dy, life, '#06d6a0', size, null, 'cross'));
                }
                break;
            case 'shield':
                count = 15;
                for(let i=0; i<count; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let speed = Math.random() * 6 + 2;
                    let dx = Math.cos(angle) * speed;
                    let dy = Math.sin(angle) * speed;
                    let life = Math.floor(Math.random() * 40) + 20;
                    let size = Math.random() * 10 + 5;
                    this.particles.push(new Particle(x + dx*5, y + dy*5, dx*0.1, dy*0.1, life, '#457b9d', size, null, 'rect'));
                }
                break;
            default:
                this.addHitEffect(x, y, '#fff', 20);
        }
    }

    addFloatingText(x, y, text, color = '#ff0000', size = 20) {
        this.particles.push(new Particle(x, y, 0, -2, 40, color, size, text));
    }

    emitAura(x, y, color) {
        if(Math.random() < 0.3) {
            this.particles.push(new Particle(
                x + (Math.random()*40 - 20), 
                y + 30, 
                0, -Math.random()*2 - 1, 
                30, color, Math.random()*3 + 1, null, 'circle'
            ));
        }
    }

    update() {
        let pCount = 0;
        for(let i = 0; i < this.particles.length; i++) {
            let p = this.particles[i];
            p.update();
            if(p.life > 0) {
                this.particles[pCount++] = p;
            }
        }
        this.particles.length = pCount;
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

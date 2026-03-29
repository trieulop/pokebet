class AudioSystem {
    static init() {
        if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    static playBattleMusic() {
        this.init();
        if(this.ctx.state === 'suspended') this.ctx.resume();
        this.stopBattleMusic();
        this.isPlaying = true;

        const patterns = [
            { bass: [196.00, 233.08, 261.63, 311.13], melody: [783.99, 932.33, 1046.50, 1244.51, 1567.98, 1244.51, 1046.50, 932.33] },
            { bass: [220.00, 207.65, 196.00, 185.00], melody: [880.00, 1046.50, 880.00, 783.99, 659.25, 783.99, 880.00, 1046.50] },
            { bass: [261.63, 261.63, 311.13, 349.23], melody: [1046.50, 1567.98, 1396.91, 1567.98, 1046.50, 1244.51, 1396.91, 1567.98] },
            { bass: [146.83, 164.81, 174.61, 196.00], melody: [587.33, 659.25, 698.46, 783.99, 880.00, 783.99, 698.46, 659.25] },
            { bass: [329.63, 293.66, 261.63, 246.94], melody: [1318.51, 1046.50, 1318.51, 1567.98, 1318.51, 1174.66, 1046.50, 987.77] }
        ];
        
        // 5パターンからランダムに選ぶ
        let p = patterns[Math.floor(Math.random() * patterns.length)];
        let bass = p.bass; 
        let melody = p.melody;
        
        let tick = 0;
        let nextNoteTime = this.ctx.currentTime + 0.1;
        let tempo = 0.12; // 120ms per tick => VERY fast, intense

        this.scheduleNotes = () => {
            if(!this.isPlaying) return;
            while(nextNoteTime < this.ctx.currentTime + 0.1) {
                // Play bass rhythm (plays every tick)
                let bassOsc = this.ctx.createOscillator();
                let bassGain = this.ctx.createGain();
                bassOsc.type = 'triangle';
                
                // cycle bass notes depending on the measure
                let measure = Math.floor(tick / 16);
                let currentBassNode = bass[measure % bass.length];
                bassOsc.frequency.value = currentBassNode / 2; // Deep bass
                
                bassOsc.connect(bassGain);
                bassGain.connect(this.ctx.destination);
                
                bassGain.gain.setValueAtTime(0.08, nextNoteTime);
                bassGain.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + tempo - 0.02);
                
                bassOsc.start(nextNoteTime);
                bassOsc.stop(nextNoteTime + tempo);
                
                // Play melody (arpeggio loop)
                let melOsc = this.ctx.createOscillator();
                let melGain = this.ctx.createGain();
                melOsc.type = 'square';
                
                let currentMelody = melody[tick % melody.length];
                // Transpose melody together with bass
                let transposeRatio = currentBassNode / bass[0];
                melOsc.frequency.value = currentMelody * transposeRatio;
                
                melOsc.connect(melGain);
                melGain.connect(this.ctx.destination);
                
                melGain.gain.setValueAtTime(0.03, nextNoteTime);
                melGain.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + tempo - 0.02);
                
                melOsc.start(nextNoteTime);
                melOsc.stop(nextNoteTime + tempo);

                tick++;
                nextNoteTime += tempo;
            }
            this.timerID = requestAnimationFrame(this.scheduleNotes);
        };
        this.scheduleNotes();
    }

    static stopBattleMusic() {
        this.isPlaying = false;
        if(this.timerID) cancelAnimationFrame(this.timerID);
    }

    static playVictoryMusic() {
        this.init();
        if(this.ctx.state === 'suspended') this.ctx.resume();
        this.stopBattleMusic();

        let time = this.ctx.currentTime;
        let notes = [523.25, 659.25, 783.99, 1046.50]; // 楽しいファンファーレ
        notes.forEach((freq, i) => {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            let t = time + i * 0.15;
            gain.gain.setValueAtTime(0.05, t);
            let len = (i === notes.length - 1) ? 0.6 : 0.1;
            gain.gain.exponentialRampToValueAtTime(0.001, t + len);
            osc.start(t);
            osc.stop(t + len + 0.1);
        });
    }

    static playDefeatMusic() {
        this.init();
        if(this.ctx.state === 'suspended') this.ctx.resume();
        this.stopBattleMusic();

        let time = this.ctx.currentTime;
        let notes = [311.13, 293.66, 277.18, 261.63]; // 残念なファンファーレ
        notes.forEach((freq, i) => {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            let t = time + i * 0.3;
            gain.gain.setValueAtTime(0.08, t);
            let len = (i === notes.length - 1) ? 1.0 : 0.2;
            gain.gain.exponentialRampToValueAtTime(0.001, t + len);
            osc.start(t);
            osc.stop(t + len + 0.1);
        });
    }

    static speakSkill(skillName) {
        if (!window.speechSynthesis) return;
        
        // 読み上げ中の音声をキャンセルして次を優先
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        
        // 可愛い電子音で「ピピッ！」という前触れを作る
        if (this.ctx && this.ctx.state !== 'suspended') {
            let t = this.ctx.currentTime;
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(1500, t);
            osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            gain.gain.setValueAtTime(0.02, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        }

        // 語尾を可愛くする
        let u = new SpeechSynthesisUtterance(skillName + "！");

        // Web Speech APIのバグ対策：変数がガベージコレクションされると途切れるため、グローバル配列に保持する
        window.utterances = window.utterances || [];
        window.utterances.push(u);
        u.onend = function() {
            let index = window.utterances.indexOf(u);
            if (index !== -1) window.utterances.splice(index, 1);
        };

        u.lang = 'ja-JP';
        
        let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
            // スマホは極端なピッチ・速度だと音声生成エンジンが落ちて途切れるため、安全で可愛い設定に
            u.pitch = 1.5; 
            u.rate = 1.0;  
        } else {
            // PC版のピカチュウ風の声
            u.pitch = 2.0; 
            u.rate = 1.2;  
        }
        
        // 環境によってはデフォルトの男性声が高くなるだけなので、可能なら女性声を探す
        let voices = window.speechSynthesis.getVoices();
        let jpVoices = voices.filter(v => v.lang && v.lang.includes('ja'));
        let cuteVoice = jpVoices.find(v => v.name.includes('Haruka') || v.name.includes('Kyoko') || v.name.includes('Hatsune') || v.name.includes('Female'));
        if (!cuteVoice && jpVoices.length > 0) cuteVoice = jpVoices[0]; // なければ最初の日本語
        if (cuteVoice) {
            u.voice = cuteVoice;
        }
        
        // スマホ(特にiOS Safari)のバグ対策：cancel()の直後にspeak()を呼ぶと新しい音声もキャンセル(途切れる)されるため、少し待つ
        setTimeout(() => {
            window.speechSynthesis.speak(u);
        }, 50);
    }

    static playEvolutionEffect(duration) {
        this.init();
        if(this.ctx.state === 'suspended') this.ctx.resume();
        
        let now = this.ctx.currentTime;
        // --- Based on Pattern ⑨: Chaos Layer ---
        const count = 5;
        for(let i=0; i < count; i++) {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
            osc.frequency.setValueAtTime(100 + i*100, now);
            osc.frequency.exponentialRampToValueAtTime(Math.random()*1000 + 200, now + duration);
            
            osc.connect(gain); 
            gain.connect(this.ctx.destination);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.02, now + duration/2);
            gain.gain.linearRampToValueAtTime(0, now + duration);
            
            osc.start(now); 
            osc.stop(now + duration);
        }
    }

    static playEvolutionSuccess() {
        this.init();
        if(this.ctx.state === 'suspended') this.ctx.resume();
        
        let now = this.ctx.currentTime;
        // --- Based on Pattern ⑨ Fanfare: Ominous Layered Cluster ---
        let notes = [100.00, 200.00, 300.00, 400.00, 500.00]; 
        let length = 1.5;
        notes.forEach((freq, i) => {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + length);
            
            osc.start(now);
            osc.stop(now + length + 0.1);
        });
    }
}

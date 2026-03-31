const GameData = {
    apiCache: {},
    evolutionCache: {},
    rarity: {
        'common': { name: 'コモン', multiplier: 1.0, color: null, prob: 0.5 },
        'rare': { name: 'レア', multiplier: 1.2, color: '#4cc9f0', prob: 0.3 },
        'epic': { name: 'エピック', multiplier: 1.5, color: '#9d4edd', prob: 0.15 },
        'legendary': { name: 'レジェン', multiplier: 2.0, color: '#ffd700', prob: 0.05 }
    },

    skills: [
        new Skill('tackle', 'たいあたり', 'attack', 40, 0, '#fff'),
        new Skill('fireblast', 'だいもんじ', 'attack', 90, 2, '#e63946'),
        new Skill('quickattack', 'でんこうせっか', 'attack', 30, 0, '#a8dadc'),
        new Skill('heal', 'じこさいせい', 'heal', 40, 3, '#06d6a0'),
        new Skill('shield', 'まもる', 'buff', 50, 2, '#457b9d'), // Buffs defense temporarily (simplified: just blocks damage or specific to logic)
        new Skill('hydropump', 'ハイドロポンプ', 'attack', 110, 3, '#4cc9f0'),
        new Skill('solarbeam', 'ソーラービーム', 'attack', 120, 3, '#06d6a0')
    ],

    roster: [
        new Pokemon('p1', 'Aqua Slime', 120, 45, 50, 40, 'slime_blue'),
        new Pokemon('p2', 'Ignis Slime', 100, 60, 40, 55, 'slime_red'),
        new Pokemon('p3', 'Terra Slime', 140, 40, 60, 30, 'slime_green'),
        new Pokemon('p4', 'Aura Slime', 110, 55, 45, 60, 'slime_gold')
    ],

    getSkill(id) {
        return this.skills.find(s => s.id === id);
    },

    getRandomRarity() {
        let r = Math.random();
        let cumulative = 0;
        for (let key in this.rarity) {
            cumulative += this.rarity[key].prob;
            if (r <= cumulative) return key;
        }
        return 'common';
    },

    generateRandomFighter(bonusMultiplier = 0) {
        let baseObj = this.roster[Math.floor(Math.random() * this.roster.length)];
        let p = baseObj.clone();
        let rarity = this.getRandomRarity();
        let availableSkills = this.skills.filter(s => s.id !== 'tackle');
        availableSkills.sort(() => Math.random() - 0.5);
        let chosenIds = ['tackle', availableSkills[0].id, availableSkills[1].id, availableSkills[2].id];
        p.setSkills(chosenIds);
        p.setup(rarity, bonusMultiplier);
        return p;
    },

    async getEvolutionId(currentId) {
        try {
            let speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${currentId}`);
            let speciesData = await speciesRes.json();
            
            if(!speciesData.evolution_chain) return currentId;
            let chainRes = await fetch(speciesData.evolution_chain.url);
            let chainData = await chainRes.json();
            
            let nextName = null;
            function findNext(chainNode) {
                if (chainNode.species.name === speciesData.name) {
                    if (chainNode.evolves_to.length > 0) {
                        return chainNode.evolves_to[Math.floor(Math.random() * chainNode.evolves_to.length)].species.name;
                    }
                    return null;
                }
                for (let next of chainNode.evolves_to) {
                    let res = findNext(next);
                    if (res) return res;
                }
                return null;
            }
            
            nextName = findNext(chainData.chain);
            if (nextName) {
                let nextRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${nextName}`);
                let nextData = await nextRes.json();
                this.evolutionCache[currentId] = nextData.id;
                return nextData.id;
            }
        } catch(e) { console.warn("Evolution API error", e); }
        this.evolutionCache[currentId] = currentId;
        return currentId;
    },

    async fetchFighterData(idOrName) {
        if (this.apiCache[idOrName]) return this.apiCache[idOrName];
        
        try {
            let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`);
            if(!res.ok) throw new Error("API call failed");
            let data = await res.json();
            
            let speciesRes = await fetch(data.species.url);
            let speciesData = await speciesRes.json();
            let jpNameEntry = speciesData.names.find(n => n.language.name === 'ja' || n.language.name === 'ja-Hrkt');
            
            let name = jpNameEntry ? jpNameEntry.name : data.name.toUpperCase();
            let hp = data.stats.find(s => s.stat.name === 'hp').base_stat;
            let atk = data.stats.find(s => s.stat.name === 'attack').base_stat;
            let def = data.stats.find(s => s.stat.name === 'defense').base_stat;
            let spd = data.stats.find(s => s.stat.name === 'speed').base_stat;
            let spriteUrl = data.sprites.front_default || data.sprites.back_default || "";
            // Priority for animated GIFs: Showdown (Gen 1-8) -> Gen 5 Animated (Gen 1-5)
            let animatedUrl = 
                (data.sprites.other && data.sprites.other.showdown && data.sprites.other.showdown.front_default) || 
                (data.sprites.versions && data.sprites.versions["generation-v"] && data.sprites.versions["generation-v"]["black-white"] && 
                 data.sprites.versions["generation-v"]["black-white"].animated && data.sprites.versions["generation-v"]["black-white"].animated.front_default);
            let types = data.types.map(t => t.type.name);
            
            let spriteKey = `api_${data.id}`;
            if (!AssetGenerator.sprites[spriteKey]) {
                let img = new Image();
                img.crossOrigin = "anonymous";
                img.src = spriteUrl;
                await new Promise(r => { img.onload = r; img.onerror = r; });
                AssetGenerator.sprites[spriteKey] = img;
            }
            
            let fd = { id: data.id, name, hp, atk, def, spd, spriteKey, uiSpriteUrl: animatedUrl || spriteUrl, types };
            this.apiCache[data.id] = fd; // Cache by ID
            this.apiCache[idOrName] = fd; // Cache by requested term
            return fd;
        } catch(e) {
            console.error("Fetch fighter fallback:", e);
            let base = this.roster[Math.floor(Math.random() * this.roster.length)];
            return {
                id: base.id, name: base.name, hp: base.baseHp, atk: base.baseAtk, def: base.baseDef, spd: base.baseSpd,
                spriteKey: base.spriteKey, uiSpriteUrl: '', types: ['normal']
            };
        }
    },

    assignRandomSkills(pokemon, count = 3) {
        let availableSkills = [...this.skills].filter(s => s.id !== 'tackle');
        
        // 分類分け
        let typeSkills = availableSkills.filter(s => s.type === 'attack');
        let utilitySkills = availableSkills.filter(s => s.type === 'buff' || s.type === 'heal');
        
        typeSkills.sort(() => Math.random() - 0.5);
        utilitySkills.sort(() => Math.random() - 0.5);
        
        let chosenIds = ['tackle'];
        
        // 攻撃スキルを優先的に追加
        if (typeSkills.length > 0) chosenIds.push(typeSkills[0].id);
        if (typeSkills.length > 1 && count > 2) chosenIds.push(typeSkills[1].id);
        
        // 補助スキルを追加
        if (utilitySkills.length > 0 && chosenIds.length < count + 1) {
            chosenIds.push(utilitySkills[0].id);
        }
        
        // 足りない場合はランダムに埋める
        availableSkills.sort(() => Math.random() - 0.5);
        while (chosenIds.length < count + 1 && availableSkills.length > 0) {
            let skill = availableSkills.pop();
            if (!chosenIds.includes(skill.id)) chosenIds.push(skill.id);
        }
        
        pokemon.setSkills(chosenIds.slice(0, count + 1));
    },

    async buildFighterInstance(idOrName, forcedRarity = null, bonusMultiplier = 0, skillCount = 3) {
        let fd = await this.fetchFighterData(idOrName);
        let p = new Pokemon(fd.id, fd.name, fd.hp, fd.atk, fd.def, fd.spd, fd.spriteKey, fd.types);
        p.uiSpriteUrl = fd.uiSpriteUrl;
        
        let rarity = forcedRarity ? forcedRarity : this.getRandomRarity();
        p.setup(rarity, bonusMultiplier);

        this.assignRandomSkills(p, skillCount);
        
        return p;
    },

    async generateSpecificFighterAPI(id, forceLegendary = false) {
        return await this.buildFighterInstance(id, forceLegendary ? 'legendary' : null, 0.5, 3);
    },

    async generateRandomFighterAPI(bonusMultiplier = 0) {
        let randId;
        if (Math.random() < 0.2) {
            const electricIds = [25, 26, 81, 82, 100, 101, 125, 135, 145, 172, 179, 180, 181, 239, 243, 309, 310, 311, 312, 403, 404, 405, 417, 462, 466, 479, 522, 523, 587, 595, 596, 602, 603, 604, 644, 702, 737, 738, 777, 785, 848, 849, 877, 894];
            randId = electricIds[Math.floor(Math.random() * electricIds.length)];
        } else {
            randId = Math.floor(Math.random() * 898) + 1;
        }
        return await this.buildFighterInstance(randId, null, bonusMultiplier, 3);
    }
};

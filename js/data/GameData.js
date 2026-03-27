const GameData = {
    rarity: {
        'common': { name: 'コモン', multiplier: 1.0, color: null, prob: 0.5 },
        'rare': { name: 'レア', multiplier: 1.2, color: '#4cc9f0', prob: 0.3 },
        'epic': { name: 'エピック', multiplier: 1.5, color: '#9d4edd', prob: 0.15 },
        'legendary': { name: 'レジェンダリー', multiplier: 2.0, color: '#ffd700', prob: 0.05 }
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
        let chosenIds = ['tackle', availableSkills[0].id, availableSkills[1].id];
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
                return nextData.id;
            }
        } catch(e) { console.error(e); }
        return currentId;
    },

    async generateSpecificFighterAPI(id, forceLegendary = false) {
        let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        let data = await res.json();
        
        let speciesRes = await fetch(data.species.url);
        let speciesData = await speciesRes.json();
        let jpNameEntry = speciesData.names.find(n => n.language.name === 'ja' || n.language.name === 'ja-Hrkt');
        
        let name = jpNameEntry ? jpNameEntry.name : data.name.toUpperCase();
        let hp = Math.floor(data.stats.find(s => s.stat.name === 'hp').base_stat * 1.5);
        let atk = Math.floor(data.stats.find(s => s.stat.name === 'attack').base_stat * 1.5);
        let def = Math.floor(data.stats.find(s => s.stat.name === 'defense').base_stat * 1.5);
        let spd = Math.floor(data.stats.find(s => s.stat.name === 'speed').base_stat * 1.5);
        let spriteUrl = data.sprites.front_default || data.sprites.back_default;
        let animatedUrl = data.sprites.other?.showdown?.front_default || data.sprites.versions?.["generation-v"]?.["black-white"]?.animated?.front_default;
        
        let img = new Image();
        img.crossOrigin = "anonymous";
        img.src = spriteUrl;
        await new Promise(r => img.onload = r);
        AssetGenerator.sprites[`api_${id}_evolved`] = img;
        
        let p = new Pokemon(id, name, hp, atk, def, spd, `api_${id}_evolved`);
        p.uiSpriteUrl = animatedUrl || spriteUrl;
        
        let rarity = forceLegendary ? 'legendary' : this.getRandomRarity();
        let availableSkills = this.skills.filter(s => s.id !== 'tackle');
        availableSkills.sort(() => Math.random() - 0.5);
        let chosenIds = ['tackle', availableSkills[0].id, availableSkills[1].id];
        
        p.setSkills(chosenIds);
        p.setup(rarity, 0.5); // flat evolution bonus
        return p;
    },

    async generateRandomFighterAPI(bonusMultiplier = 0) {
        let randId = Math.floor(Math.random() * 898) + 1; // Gen 1-8
        let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${randId}`);
        let data = await res.json();
        
        let speciesRes = await fetch(data.species.url);
        let speciesData = await speciesRes.json();
        let jpNameEntry = speciesData.names.find(n => n.language.name === 'ja' || n.language.name === 'ja-Hrkt');

        let name = jpNameEntry ? jpNameEntry.name : data.name.toUpperCase();
        let hp = data.stats.find(s => s.stat.name === 'hp').base_stat;
        let atk = data.stats.find(s => s.stat.name === 'attack').base_stat;
        let def = data.stats.find(s => s.stat.name === 'defense').base_stat;
        let spd = data.stats.find(s => s.stat.name === 'speed').base_stat;
        let spriteUrl = data.sprites.front_default || data.sprites.back_default;
        let animatedUrl = data.sprites.other?.showdown?.front_default || data.sprites.versions?.["generation-v"]?.["black-white"]?.animated?.front_default;
        
        let img = new Image();
        img.crossOrigin = "anonymous";
        img.src = spriteUrl;
        await new Promise(r => img.onload = r);
        AssetGenerator.sprites[`api_${randId}`] = img;
        
        let p = new Pokemon(randId, name, hp, atk, def, spd, `api_${randId}`);
        p.uiSpriteUrl = animatedUrl || spriteUrl;
        let rarity = this.getRandomRarity();
        let availableSkills = this.skills.filter(s => s.id !== 'tackle');
        availableSkills.sort(() => Math.random() - 0.5);
        let chosenIds = ['tackle', availableSkills[0].id, availableSkills[1].id];
        p.setSkills(chosenIds);
        p.setup(rarity, bonusMultiplier);
        return p;
    }
};

class PokemonService {
    static threeStageCandidates = [
        1, 4, 7, 10, 13, 16, 29, 32, 43, 60, 63, 66, 69, 92, 147,
        152, 155, 158, 161, 165, 172, 175, 179, 183, 187, 236, 238, 239, 240, 246,
        252, 255, 258, 263, 265, 270, 273, 280, 287, 296, 298, 304, 328, 353, 355, 363, 371, 374
    ];

    static async getFourCandidates() {
        let candidates = [];
        let usedTypes = new Set();
        let shuffledIds = [...this.threeStageCandidates].sort(() => Math.random() - 0.5);

        for (let id of shuffledIds) {
            if (candidates.length >= 4) break;
            try {
                let fighter = await GameData.buildFighterInstance(id);
                // Ensure it has a type we haven't selected yet to enforce diversity
                let mainType = fighter.types[0];
                if (!usedTypes.has(mainType)) {
                    // Set up base stats assuming level 5 (stats from build are base stats)
                    fighter.setup('common', 0); 
                    fighter.playerControlled = true;
                    fighter.winCount = 0;
                    fighter.evolutionStage = 1;
                    
                    // Assign 4 moves (Tackle + 2 elemental + 1 buff/heal)
                    let availableSkills = [...GameData.skills].filter(s => s.id !== 'tackle');
                    // Prefer matching type skill if exists
                    let typeSkills = availableSkills.filter(s => s.type === 'attack');
                    let utilitySkills = availableSkills.filter(s => s.type === 'buff' || s.type === 'heal');
                    
                    typeSkills.sort(() => Math.random() - 0.5);
                    utilitySkills.sort(() => Math.random() - 0.5);
                    
                    let chosenIds = ['tackle'];
                    if(typeSkills.length > 0) chosenIds.push(typeSkills[0].id);
                    if(typeSkills.length > 1) chosenIds.push(typeSkills[1].id);
                    if(utilitySkills.length > 0) chosenIds.push(utilitySkills[0].id);
                    
                    // Fallbacks if not enough skills
                    while(chosenIds.length < 4 && availableSkills.length > 0) {
                        let fill = availableSkills.pop();
                        if(!chosenIds.includes(fill.id)) chosenIds.push(fill.id);
                    }
                    
                    fighter.setSkills(chosenIds);
                    
                    usedTypes.add(mainType);
                    candidates.push(fighter);
                }
            } catch (e) {
                console.warn("Failed to load candidate", id, e);
            }
        }
        return candidates;
    }

    static async generateEnemy(playerFighter) {
        let pStats = playerFighter.maxHp + playerFighter.atk + playerFighter.def + playerFighter.spd;
        let enemy = null;
        
        // Random gen 1-3
        let randId = Math.floor(Math.random() * 386) + 1;
        enemy = await GameData.buildFighterInstance(randId);
        enemy.setup('common', 0);
        
        let eStats = enemy.maxHp + enemy.atk + enemy.def + enemy.spd;
        
        // Scale enemy stats to be within -7% to -2% of player's total stats (93% to 98%)
        let targetEStats = pStats * (0.93 + Math.random() * 0.05);
        let scale = targetEStats / eStats;
        
        enemy.maxHp = Math.floor(enemy.maxHp * scale);
        enemy.hp = enemy.maxHp;
        enemy.atk = Math.floor(enemy.atk * scale);
        enemy.def = Math.floor(enemy.def * scale);
        enemy.spd = Math.floor(enemy.spd * scale);
        
        enemy.playerControlled = false;
        
        // Give enemy 4 skills
        let availableSkills = [...GameData.skills].filter(s => s.id !== 'tackle');
        availableSkills.sort(() => Math.random() - 0.5);
        let chosenIds = ['tackle', availableSkills[0].id, availableSkills[1].id, availableSkills[2]?.id || 'heal'];
        enemy.setSkills(chosenIds.filter(id => id)); // remove undefined if not enough skills
        
        return enemy;
    }
}

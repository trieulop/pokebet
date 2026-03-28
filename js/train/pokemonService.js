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
                let fighter = await GameData.buildFighterInstance(id, 'common', 0, 3);
                // Ensure it has a type we haven't selected yet to enforce diversity
                let mainType = fighter.types[0];
                if (!usedTypes.has(mainType)) {
                    fighter.playerControlled = true;
                    fighter.winCount = 0;
                    fighter.evolutionStage = 1;

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
        
        // Random gen 1-3
        let randId = Math.floor(Math.random() * 386) + 1;
        let enemy = await GameData.buildFighterInstance(randId, 'common', 0, 3);
        
        let eStats = enemy.maxHp + enemy.atk + enemy.def + enemy.spd;
        
        // Scale enemy stats to be within -7% to -2% of player's total stats (93% to 98%)
        let scale = (pStats * (0.93 + Math.random() * 0.05)) / eStats;
        
        enemy.maxHp = Math.floor(enemy.maxHp * scale);
        enemy.hp = enemy.maxHp;
        enemy.atk = Math.floor(enemy.atk * scale);
        enemy.def = Math.floor(enemy.def * scale);
        enemy.spd = Math.floor(enemy.spd * scale);
        enemy.playerControlled = false;
        
        return enemy;
    }
}

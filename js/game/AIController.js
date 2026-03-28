class AIController {
    // Selects the smartest move based on state
    static chooseSkill(attacker, defender) {
        let availableSkills = attacker.skills.filter(s => s.isReady());
        
        // If only 1 skill, use it
        if(availableSkills.length === 1) return availableSkills[0];

        let attackerHpPerc = attacker.getHpPerc();
        let defenderHpPerc = defender.getHpPerc();
        let isFaster = attacker.spd > defender.spd;

        let bestScore = -Infinity;
        let chosen = availableSkills[0];

        for(let s of availableSkills) {
            let score = 0;
            switch(s.type) {
                case 'heal':
                    // Score high if HP is low
                    if(attackerHpPerc < 0.3) {
                        score += 100; // Critical need
                    } else if (attackerHpPerc < 0.6) {
                        score += 50;
                    } else {
                        score -= 50; // Don't heal if high HP
                    }
                    break;

                case 'buff':
                    // Buff if anticipating big hit or just decent utility early
                    if(defenderHpPerc > 0.5 && attackerHpPerc > 0.4) {
                        score += 40; 
                    }
                    break;

                case 'attack':
                    score += s.power * 0.5; // Base preference to high power

                    // If opponent is very low, use high power to finish them off
                    if(defenderHpPerc < 0.25) {
                        score += s.power; 
                    }

                    // If we are faster and can burst them
                    if(isFaster && defenderHpPerc < 0.4) {
                        score += s.power * 0.8;
                    }

                    // Priority handling if skill is quick attack
                    if(s.id === 'quickattack' && attackerHpPerc < 0.2 && defenderHpPerc < 0.2) {
                        // Might win the speed tie
                        score += 200;
                    }
                    
                    // Type Effectiveness Bonus
                    if (typeof TrainBattleController !== 'undefined') {
                        let eff = TrainBattleController.getEffectiveness(s.element, defender.types);
                        if (eff > 1) score += 50; // Super effective bonus
                        if (eff < 1) score -= 30; // Not very effective penalty
                    }
                    break;
            }

            // Small random jitter to prevent fully deterministic loops
            score += Math.random() * 10;

            if(score > bestScore) {
                bestScore = score;
                chosen = s;
            }
        }

        return chosen;
    }
}

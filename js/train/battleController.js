const TypeEffectiveness = {
    fire: { strongAgainst: ['grass', 'bug', 'ice', 'steel'], weakAgainst: ['water', 'ground', 'rock'] },
    water: { strongAgainst: ['fire', 'ground', 'rock'], weakAgainst: ['electric', 'grass'] },
    grass: { strongAgainst: ['water', 'ground', 'rock'], weakAgainst: ['fire', 'ice', 'poison', 'flying', 'bug'] },
    electric: { strongAgainst: ['water', 'flying'], weakAgainst: ['ground'] },
    ice: { strongAgainst: ['grass', 'ground', 'flying', 'dragon'], weakAgainst: ['fire', 'fighting', 'rock', 'steel'] },
    fighting: { strongAgainst: ['normal', 'ice', 'rock', 'dark', 'steel'], weakAgainst: ['flying', 'psychic', 'fairy'] },
    poison: { strongAgainst: ['grass', 'fairy'], weakAgainst: ['ground', 'psychic'] },
    ground: { strongAgainst: ['fire', 'electric', 'poison', 'rock', 'steel'], weakAgainst: ['water', 'grass', 'ice'] },
    flying: { strongAgainst: ['grass', 'fighting', 'bug'], weakAgainst: ['electric', 'ice', 'rock'] },
    psychic: { strongAgainst: ['fighting', 'poison'], weakAgainst: ['bug', 'ghost', 'dark'] },
    bug: { strongAgainst: ['grass', 'psychic', 'dark'], weakAgainst: ['fire', 'flying', 'rock'] },
    rock: { strongAgainst: ['fire', 'ice', 'flying', 'bug'], weakAgainst: ['water', 'grass', 'fighting', 'ground', 'steel'] },
    ghost: { strongAgainst: ['psychic', 'ghost'], weakAgainst: ['ghost', 'dark'] },
    dragon: { strongAgainst: ['dragon'], weakAgainst: ['ice', 'dragon', 'fairy'] },
    dark: { strongAgainst: ['psychic', 'ghost'], weakAgainst: ['fighting', 'bug', 'fairy'] },
    steel: { strongAgainst: ['ice', 'rock', 'fairy'], weakAgainst: ['fire', 'fighting', 'ground'] },
    fairy: { strongAgainst: ['fighting', 'dragon', 'dark'], weakAgainst: ['poison', 'steel'] },
    normal: { strongAgainst: [], weakAgainst: ['fighting'] }
};

class TrainBattleController {
    static getEffectiveness(attackType, defenderTypes) {
        if (!attackType || attackType === 'normal') return 1.0;
        let mult = 1.0;
        let data = TypeEffectiveness[attackType];
        if(!data) return 1.0;
        
        for (let t of defenderTypes) {
            if (data.strongAgainst.includes(t)) mult *= 2.0;
            if (data.weakAgainst.includes(t)) mult *= 0.5;
            // Immunities omitted for simplicity to prevent soft locks unless implemented
        }
        return mult;
    }
}

class Pokemon {
    constructor(id, name, baseHp, baseAtk, baseDef, baseSpd, spriteKey, types = ['normal']) {
        this.id = id;
        this.name = name;
        this.baseHp = baseHp;
        this.baseAtk = baseAtk;
        this.baseDef = baseDef;
        this.baseSpd = baseSpd;
        this.spriteKey = spriteKey;
        this.types = types;
        this.skills = [];

        // Rarity modifiers initialized later
        this.rarity = 'common';
        this.hp = 0;
        this.maxHp = 0;
        this.atk = 0;
        this.def = 0;
        this.spd = 0;
        
        // Progression bonus
        this.bonusStats = 0;
    }

    setup(rarityLevel, bonusMultiplier = 0) {
        const rarityData = GameData.rarity[rarityLevel];
        this.rarity = rarityLevel;
        let mult = rarityData.multiplier + bonusMultiplier;

        this.maxHp = Math.floor(this.baseHp * mult);
        this.hp = this.maxHp;
        this.atk = Math.floor(this.baseAtk * mult);
        this.def = Math.floor(this.baseDef * mult);
        this.spd = Math.floor(this.baseSpd * mult);
        
        // Reset skills
        this.skills.forEach(s => s.resetCooldown());
    }

    setSkills(skillIds) {
        this.skills = skillIds.map(id => GameData.getSkill(id).clone());
    }

    takeDamage(amount) {
        // Simple mitigation formula
        let mitigatedAmount = Math.max(1, Math.floor(amount * (100 / (100 + this.def))));
        this.hp -= mitigatedAmount;
        if(this.hp < 0) this.hp = 0;
        return mitigatedAmount;
    }

    heal(amount) {
        let healAmount = Math.floor(this.maxHp * (amount / 100)); // Heal is % based for simplicity
        if (healAmount < 10) healAmount = 10; // Ensure minimum heal is 10
        this.hp += healAmount;
        if(this.hp > this.maxHp) this.hp = this.maxHp;
        return healAmount;
    }

    isAlive() {
        return this.hp > 0;
    }

    getHpPerc() {
        return this.hp / this.maxHp;
    }

    clone() {
        let p = new Pokemon(this.id, this.name, this.baseHp, this.baseAtk, this.baseDef, this.baseSpd, this.spriteKey, this.types);
        p.skills = this.skills.map(s => s.clone());
        return p;
    }
}

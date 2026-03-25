class Skill {
    constructor(id, name, type, power, cooldown, effectAnim) {
        this.id = id;
        this.name = name;
        this.type = type; // 'attack', 'heal', 'buff'
        this.power = power;
        this.cooldown = cooldown;
        this.currentCooldown = 0;
        this.effectAnim = effectAnim; // particle color or specific effect identifier
    }

    resetCooldown() {
        this.currentCooldown = 0;
    }

    tickCooldown() {
        if(this.currentCooldown > 0) {
            this.currentCooldown--;
        }
    }

    isReady() {
        return this.currentCooldown === 0;
    }

    use() {
        this.currentCooldown = this.cooldown;
    }

    clone() {
        return new Skill(this.id, this.name, this.type, this.power, this.cooldown, this.effectAnim);
    }
}

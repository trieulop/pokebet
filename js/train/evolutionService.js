class EvolutionService {
    static CONFIG = {
        WIN_MILESTONE: 3,
        STAT_BOOST_MULT: 1.25
    };

    /**
     * Called after each battle win milestone (every 3 wins).
     * - If evolution is possible  → returns evolved fighter (isFinalEvolution: false)
     * - If already at final form  → returns same fighter with isFinalEvolution: true
     */
    static async handleEvolution(fighter) {
        // Only attempt evolution after every X wins
        if (fighter.winCount > 0 && fighter.winCount % this.CONFIG.WIN_MILESTONE === 0) {
            let nextId = await GameData.getEvolutionId(fighter.id);

            if (nextId && nextId !== fighter.id) {
                // ---- Evolution available ----
                let oldHp     = fighter.maxHp;
                let oldAtk    = fighter.atk;
                let oldDef    = fighter.def;
                let oldSpd    = fighter.spd;
                let oldSkills = [...fighter.skills];
                let oldWinCount = fighter.winCount;
                let oldWinsAfterFinal = fighter.winsAfterFinal || 0;

                let newFighter = await GameData.buildFighterInstance(nextId, null, 0);
                newFighter.playerControlled = true;
                newFighter.winCount         = oldWinCount;
                newFighter.evolutionStage   = (fighter.evolutionStage || 1) + 1;
                newFighter.winsAfterFinal   = oldWinsAfterFinal;
                newFighter.skills           = oldSkills;

                // Check if this NEW form is the final form
                let secondNextId = await GameData.getEvolutionId(nextId);
                newFighter.isFinalEvolution = (!secondNextId || secondNextId === nextId);

                // +25% stat boost on evolution for that "powerful" feel
                newFighter.maxHp = Math.floor(oldHp  * 1.25);
                newFighter.hp    = newFighter.maxHp;
                newFighter.atk   = Math.floor(oldAtk * 1.25);
                newFighter.def   = Math.floor(oldDef * 1.25);
                newFighter.spd   = Math.floor(oldSpd * 1.25);

                return newFighter;
            } else {
                // ---- No further evolution possible (already finalized) ----
                fighter.isFinalEvolution = true;
            }
        } else if (fighter.isFinalEvolution === undefined) {
            // Check if it's already a final form that can't evolve at all
            let nextId = await GameData.getEvolutionId(fighter.id);
            if (!nextId || nextId === fighter.id) {
                fighter.isFinalEvolution = true;
            }
        }

        return fighter;
    }
}

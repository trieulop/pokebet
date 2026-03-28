/**
 * Shared UI Utility class for screen management and icon generation.
 * This ensures consistency across PokeBet and PokeTrain modes.
 */
class UIUtils {
    static TypeColors = {
        normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
        grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
        ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
        rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
        steel: '#B7B7CE', fairy: '#D685AD'
    };

    /**
     * Standard screen transition logic.
     * @param {string|null} screenId - ID of the screen to activate. Pass null to hide all.
     */
    static showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        if (screenId) {
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.classList.add('active');
            } else {
                console.warn(`[UIUtils] Screen ID not found: ${screenId}`);
            }
        }
    }

    /**
     * Generates HTML for a Pokemon type icon.
     * @param {string} type - Pokemon type name.
     * @returns {string} HTML string.
     */
    static getTypeIconHTML(type) {
        if (!type) return '';
        let safeType = type.toLowerCase();
        let color = this.TypeColors[safeType] || '#A8A77A';
        let url = `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${safeType}.svg`;
        return `<img src="${url}" style="width:20px;height:20px;border-radius:50%;background-color:${color};margin-right:4px;vertical-align:middle;box-shadow: 0 0 4px rgba(0,0,0,0.5); object-fit: contain; padding: 2px; box-sizing: border-box;" alt="${safeType}">`;
    }
}

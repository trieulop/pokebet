window.addEventListener('load', async () => {
    // Generate base graphics
    AssetGenerator.init();

    // Initialize systems
    const battleEngine = new BattleEngine('gameCanvas');
    const uiManager = new UIManager(battleEngine);

    // Initial game state setup
    await uiManager.generateMatchup();

    // Game loop
    let lastTime = 0;
    function gameLoop(timestamp) {
        requestAnimationFrame(gameLoop);
        
        // Let we cap to ~60fps
        let dt = timestamp - lastTime;
        if(dt < 16) return;
        lastTime = timestamp;

        // Render battle if active
        // The render method clears the canvas and draws everything
        battleEngine.render();
    }

    requestAnimationFrame(gameLoop);
});

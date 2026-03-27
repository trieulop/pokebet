window.addEventListener('load', async () => {
    // Generate base graphics
    AssetGenerator.init();

    // Initialize systems
    const battleEngine = new BattleEngine('gameCanvas');
    const uiManager = new UIManager(battleEngine);

    // Initial game state setup
    await uiManager.generateMatchup();

    // Responsive full screen resizing
    function resizeGame() {
        const gameContainer = document.getElementById('game-container');
        const canvas = document.getElementById('gameCanvas');
        if (!gameContainer || !canvas) return;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Update BattleEngine limits live
        battleEngine.canvasWidth = canvas.width;
        battleEngine.canvasHeight = canvas.height;
        
        // Regenerate background to match browser size exactly
        AssetGenerator.sprites['bg_arena'] = AssetGenerator.createGameBackground(canvas.width, canvas.height);
    }
    window.addEventListener('resize', resizeGame);
    resizeGame();


    // Game loop
    let lastTime = 0;
    function gameLoop(timestamp) {
        requestAnimationFrame(gameLoop);
        
        // Let we cap to ~60fps
        let dt = timestamp - lastTime;
        if(dt < 15) return;
        lastTime = timestamp;

        // Render battle if active
        // The render method clears the canvas and draws everything
        battleEngine.render();
    }

    requestAnimationFrame(gameLoop);
});

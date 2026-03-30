window.addEventListener('load', async () => {
    // Generate base graphics
    AssetGenerator.init();

    // Initialize systems
    const battleEngine = new BattleEngine('gameCanvas');
    const uiManager = new UIManager(battleEngine);
    const trainController = new TrainUIController(battleEngine);
    const soloManager = new SoloManager(battleEngine);

    // Game Selection Menu Initialization
    const btnPokeBet = document.getElementById('btn-select-pokebet');
    const btnPokeTrain = document.getElementById('btn-select-poketrain');
    const btnPokeSolo = document.getElementById('btn-select-pokesolo');
    const selectionScreen = document.getElementById('game-selection-screen');
    const bettingScreen = document.getElementById('betting-screen');
    const topBar = document.getElementById('top-bar');

    btnPokeBet.addEventListener('click', async () => {
        UIUtils.showScreen('betting-screen');
        topBar.classList.remove('hidden');
        battleEngine.forceBackground = null; // Ensure no leftover backgrounds
        await uiManager.generateMatchup();
    });

    btnPokeTrain.addEventListener('click', () => {
        UIUtils.showScreen(null); // Just hide all first
        battleEngine.battleMode = 'auto'; 
        battleEngine.forceBackground = null; // CLEAR SOCCER BACKGROUND
        trainController.boot();
    });

    btnPokeSolo.addEventListener('click', () => {
        battleEngine.battleMode = 'manual'; 
        soloManager.boot();
    });

    // Responsive full screen resizing
    function resizeGame() {
        const gameContainer = document.getElementById('game-container');
        const canvas = document.getElementById('gameCanvas');
        const canvasFG = document.getElementById('gameCanvasFG');
        if (!gameContainer || !canvas) return;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.getContext('2d').imageSmoothingEnabled = false;
        if (canvasFG) {
            canvasFG.width = window.innerWidth;
            canvasFG.height = window.innerHeight;
            canvasFG.getContext('2d').imageSmoothingEnabled = false;
        }
        
        // Update BattleEngine limits live
        battleEngine.canvasWidth = canvas.width;
        battleEngine.canvasHeight = canvas.height;
        
        // Removed procedural background regeneration to prevent overriding custom assets
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

        // Render battle only if active to save resources
        if (battleEngine.isRunning) {
            battleEngine.render();
        }
    }

    requestAnimationFrame(gameLoop);
});

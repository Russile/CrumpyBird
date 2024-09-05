const container = document.getElementById('gameContainer');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameWidth = 320;
const gameHeight = 480;

// Load bird images
const birdImgUp = new Image();
birdImgUp.src = 'bird_up.png';
const birdImgDown = new Image();
birdImgDown.src = 'bird_down.png';
const birdImg = new Image();
birdImg.src = 'bird.png';

let currentBirdImg = birdImgUp; // Start with bird_up.png

// Load background image
const backgroundImg = new Image();
backgroundImg.src = 'background.png';
let backgroundX = 0;

let frameCount = 0;

// Game variables
let bird = {
    x: gameWidth * 0.2,
    y: gameHeight * 0.5,
    width: 30,  // Adjust this value to match your bird image width
    height: 30, // Adjust this value to match your bird image height
    velocity: 0,
    gravity: 0.5,
    jump: -7.4,
    rotation: 0
};

let pipes = [];
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let gameOver = false;
let gameStarted = false;
let testMode = false;
let pipesPassed = 0;
let backgroundSpeed = 1;
let pipeSpeed = 2;
const SPEED_INCREASE_AMOUNT = 0.1; // Increase speed by 0.1 each time
const MAX_SPEED = 10; // Maximum speed
const INITIAL_PIPE_SPEED = 2; // Initial pipe speed
const INITIAL_BACKGROUND_SPEED = 1; // Initial background speed
const PIPE_SPACING = 200; // Desired horizontal spacing between pipes in pixels
let lastPipeSpawnX = gameWidth;

// Load pipe images
const pipeImgs = [
    'pipe1.png',
    'pipe2.png',
    'pipe3.png'
].map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

function createPipe() {
    const gapHeight = 150; // Adjust this value to change difficulty
    const minHeight = 50;
    const maxHeight = gameHeight - gapHeight - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    return {
        x: gameWidth,
        y: topHeight + gapHeight,
        width: 50,
        topHeight: topHeight,
        bottomY: topHeight + gapHeight,
        passed: false,
        img: pipeImgs[Math.floor(Math.random() * pipeImgs.length)]
    };
}

// Add this function to calculate distance between two points
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

// Modify the checkCollision function to use circular hitbox
function checkCollision(birdX, birdY, pipeX, pipeTop, pipeBottom) {
    const birdRadius = bird.width / 2;
    const birdCenterX = birdX + birdRadius;
    const birdCenterY = birdY + birdRadius;
    const pipeWidth = 50; // Adjust this to match your pipe width

    // Only check for collision if the bird is horizontally aligned with the pipe
    if (birdCenterX + birdRadius > pipeX && birdCenterX - birdRadius < pipeX + pipeWidth) {
        // Check if bird is too high (colliding with top pipe)
        if (birdCenterY - birdRadius < pipeTop) {
            return true;
        }
        // Check if bird is too low (colliding with bottom pipe)
        if (birdCenterY + birdRadius > pipeBottom) {
            return true;
        }
    }

    return false;
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
}

const FIXED_DELTA_TIME = 1 / 60; // 60 FPS logic update
let lastUpdateTime = 0;

// Add these variables to your game state
let lastFlapDirection = 0; // 0 for neutral, -1 for up, 1 for down
let flapDownFrames = 0;
let flapTransitionFrames = 0;
const FLAP_DOWN_DURATION = 9; 
const FLAP_TRANSITION_DURATION = 2; // Duration for transition to neutral

function update() {
    if (!gameStarted) return;
    if (gameOver) return;

    frameCount++;

    // Apply gravity and update bird position
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    // Bird animation
    if (flapDownFrames > 0) {
        flapDownFrames--;
        currentBirdImg = birdImgDown; // DOWN image when jump is pressed
    } else if (flapTransitionFrames > 0) {
        flapTransitionFrames--;
        currentBirdImg = birdImg; // Neutral image during transition
    } else {
        if (bird.velocity >= 0) {
            currentBirdImg = birdImgUp; // UP image when the bird is falling
        } else {
            currentBirdImg = birdImg; // Neutral image when moving upwards
        }
    }

    // Bird rotation
    if (bird.velocity < 0) {
        bird.rotation = -0.3; // Rotate slightly upwards when jumping
    } else {
        bird.rotation = Math.min(Math.PI / 6, bird.rotation + 0.05); // Gradually rotate downwards, max 30 degrees
    }

    // Update background position
    backgroundX -= backgroundSpeed;
    if (backgroundX <= -backgroundImg.width + 1) {
        backgroundX += backgroundImg.width - 1;
    }

    // Test mode modifications
    if (testMode) {
        // Prevent bird from falling through the bottom of the screen
        if (bird.y + bird.height > gameHeight) {
            bird.y = gameHeight - bird.height;
            bird.velocity = 0;
        }
        // Prevent bird from flying too high
        if (bird.y < 0) {
            bird.y = 0;
            bird.velocity = 0;
        }
    } else {
        // Normal mode collision checks
        // Check if bird hits the ground or flies too high
        if (bird.y + bird.height > gameHeight || bird.y < 0) {
            gameOver = true;
            updateHighScore();
        }

        // Check for collisions with pipes
        for (let pipe of pipes) {
            if (checkCollision(bird.x, bird.y, pipe.x, pipe.topHeight, pipe.bottomY)) {
                gameOver = true;
                updateHighScore();
                break;
            }
        }
    }

    // Move existing pipes and check for passing
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= pipeSpeed;

        // Check if pipe is passed
        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            pipe.passed = true;
            score++;
            pipesPassed++;
            updateHighScore();

            // Increase speed every pipe
            backgroundSpeed = Math.min(backgroundSpeed + SPEED_INCREASE_AMOUNT, MAX_SPEED);
            pipeSpeed = Math.min(pipeSpeed + SPEED_INCREASE_AMOUNT, MAX_SPEED);
            console.log(`Speed increased: Background ${backgroundSpeed.toFixed(2)}, Pipes ${pipeSpeed.toFixed(2)}`);
        }

        // Remove pipe if it's off screen
        if (pipe.x < -pipe.width) {
            pipes.splice(i, 1);
        }
    }

    // Spawn new pipes based on the last pipe's position
    if (lastPipeSpawnX - pipeSpeed <= gameWidth - PIPE_SPACING) {
        pipes.push(createPipe());
        lastPipeSpawnX = gameWidth;
    } else {
        lastPipeSpawnX -= pipeSpeed;
    }
}

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);

    // Update game state at a fixed time step
    while (currentTime - lastUpdateTime >= FIXED_DELTA_TIME * 1000) {
        update();
        lastUpdateTime += FIXED_DELTA_TIME * 1000;
    }

    // Render as often as possible
    draw();
}

// Draw game elements
function draw() {
    ctx.clearRect(0, 0, gameWidth, gameHeight);

    // Draw scrolling background with 1px overlap
    ctx.drawImage(backgroundImg, Math.floor(backgroundX), 0);
    ctx.drawImage(backgroundImg, Math.floor(backgroundX) + backgroundImg.width - 1, 0);

    if (!gameStarted) {
        // Draw start screen
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, gameWidth, gameHeight);
        
        ctx.fillStyle = '#4CAF50'; // Green color
        ctx.font = '24px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('Crumpy Bird', gameWidth / 2, gameHeight / 4);
        
        ctx.fillStyle = 'white';
        ctx.font = '16px "Press Start 2P"';
        ctx.fillText('Tap or Press Space', gameWidth / 2, gameHeight / 2);
        ctx.fillText('to Start', gameWidth / 2, gameHeight / 2 + 30);
        
        return;  // Don't draw anything else
    }

    // Draw bird with rotation
    ctx.save();
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    ctx.rotate(bird.rotation);
    ctx.drawImage(currentBirdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    ctx.restore();

    // Draw pipes
    pipes.forEach(pipe => {
        const pipeWidth = pipe.width;
        const pipeImgWidth = pipe.img.width;
        const pipeImgHeight = pipe.img.height;

        // Draw top pipe (flipped upside down)
        ctx.save();
        ctx.translate(pipe.x + pipeWidth / 2, pipe.topHeight / 2);
        ctx.scale(1, -1);
        ctx.drawImage(
            pipe.img,
            0, 0, pipeImgWidth, pipe.topHeight, // source rectangle
            -pipeWidth / 2, -pipe.topHeight / 2, pipeWidth, pipe.topHeight // destination rectangle
        );
        ctx.restore();

        // Draw bottom pipe
        ctx.drawImage(
            pipe.img,
            0, 0, pipeImgWidth, gameHeight - pipe.bottomY, // source rectangle
            pipe.x, pipe.bottomY, pipeWidth, gameHeight - pipe.bottomY // destination rectangle
        );
    });

    // Draw score
    ctx.fillStyle = '#FFD700'; // Gold color
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);

    // Draw high score
    ctx.fillStyle = '#FFFFFF'; // White color
    ctx.font = '12px "Press Start 2P"';
    ctx.fillText(`High Score: ${highScore}`, 10, 50);

    // Draw speed meter at the bottom left
    const SPEED_METER_WIDTH = 100;
    const SPEED_METER_HEIGHT = 10;
    const SPEED_METER_MARGIN = 10; // Margin from the bottom and left edges
    const speedPercentage = (pipeSpeed - INITIAL_PIPE_SPEED) / (MAX_SPEED - INITIAL_PIPE_SPEED);
    const meterFillWidth = speedPercentage * SPEED_METER_WIDTH;

    // Draw meter background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(SPEED_METER_MARGIN, gameHeight - SPEED_METER_MARGIN - SPEED_METER_HEIGHT, SPEED_METER_WIDTH, SPEED_METER_HEIGHT);

    // Draw meter fill
    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.fillRect(SPEED_METER_MARGIN, gameHeight - SPEED_METER_MARGIN - SPEED_METER_HEIGHT, meterFillWidth, SPEED_METER_HEIGHT);

    // Draw meter border
    ctx.strokeStyle = 'white';
    ctx.strokeRect(SPEED_METER_MARGIN, gameHeight - SPEED_METER_MARGIN - SPEED_METER_HEIGHT, SPEED_METER_WIDTH, SPEED_METER_HEIGHT);

    // Draw speed label
    ctx.fillStyle = 'white';
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText('Speed', SPEED_METER_MARGIN, gameHeight - SPEED_METER_MARGIN - SPEED_METER_HEIGHT - 5);

    if (gameOver) {
        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, gameWidth, gameHeight);

        ctx.fillStyle = '#FF4136'; // Bright red
        ctx.font = '24px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', gameWidth / 2, gameHeight / 2 - 50);

        ctx.fillStyle = '#FFFFFF'; // White
        ctx.font = '16px "Press Start 2P"';
        ctx.fillText(`Score: ${score}`, gameWidth / 2, gameHeight / 2);
        ctx.fillText(`High Score: ${highScore}`, gameWidth / 2, gameHeight / 2 + 30);

        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('Tap or Press Space', gameWidth / 2, gameHeight / 2 + 70);
        ctx.fillText('to Restart', gameWidth / 2, gameHeight / 2 + 90);
    }

    // Display Test Mode indicator and diagnostic information if active
    if (testMode) {
        ctx.fillStyle = '#4CAF50';
        ctx.font = '12px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('Test Mode', 10, gameHeight - 10);

        // Diagnostic information
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`Background X: ${backgroundX.toFixed(2)}`, 10, 70);
        ctx.fillText(`Bird Y: ${bird.y.toFixed(2)}`, 10, 90);
        ctx.fillText(`Bird Velocity: ${bird.velocity.toFixed(2)}`, 10, 110);
        ctx.fillText(`Pipes: ${pipes.length}`, 10, 130);
        ctx.fillText(`Pipes Passed: ${pipesPassed}`, 10, 150);
        ctx.fillText(`Pipe Speed: ${pipeSpeed.toFixed(2)}`, 10, 170);
        ctx.fillText(`Frame Count: ${frameCount}`, 10, 190);
        
        // Add this to show the position of the first pipe
        if (pipes.length > 0) {
            ctx.fillText(`First Pipe X: ${pipes[0].x.toFixed(2)}`, 10, 210);
        }
    }
}

function handleInput(event) {
    if (event.type === 'touchstart') {
        event.preventDefault();
    }
    if (!gameStarted) {
        gameStarted = true;
        return;
    }
    if (gameOver) {
        resetGame();
    } else {
        bird.velocity = bird.jump;
        flapDownFrames = FLAP_DOWN_DURATION;
        flapTransitionFrames = FLAP_TRANSITION_DURATION;
    }
}

document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        handleInput(event);
    } else if (event.code === 'KeyT' && !gameStarted) {
        testMode = !testMode;
        console.log("Test mode " + (testMode ? "enabled" : "disabled"));
    }
});

canvas.addEventListener('touchstart', handleInput);

function resetGame() {
    bird = {
        x: gameWidth * 0.2,
        y: gameHeight * 0.5,
        width: 30,  // Adjust this value to match your bird image width
        height: 30, // Adjust this value to match your bird image height
        velocity: 0,
        gravity: 0.5,
        jump: -7.4,
        rotation: 0
    };
    pipes = [];
    score = 0;
    pipesPassed = 0;
    gameOver = false;
    gameStarted = false;
    frameCount = 0;
    backgroundSpeed = INITIAL_BACKGROUND_SPEED;
    pipeSpeed = INITIAL_PIPE_SPEED;
    testMode = false;
    lastFlapDirection = 0;
    flapDownFrames = 0;
    flapTransitionFrames = 0;
    currentBirdImg = birdImg; // Start with neutral image
    lastPipeSpawnX = gameWidth;
}

// Ensure all images are loaded before starting the game
Promise.all([
    ...pipeImgs.map(img => img.decode()),
    birdImg.decode(),
    birdImgUp.decode(),
    birdImgDown.decode(),
    backgroundImg.decode()
]).then(() => {
    // Start the game loop
    lastUpdateTime = performance.now();
    requestAnimationFrame(gameLoop);
}).catch(err => {
    console.error("Error loading images:", err);
});

// Set canvas size to fit the container
function resizeCanvas() {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scale = Math.min(containerWidth / gameWidth, containerHeight / gameHeight);
    
    canvas.style.width = `${gameWidth * scale}px`;
    canvas.style.height = `${gameHeight * scale}px`;
    
    // Adjust for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = gameWidth * scale * dpr;
    canvas.height = gameHeight * scale * dpr;
    
    ctx.scale(scale * dpr, scale * dpr);
}

// Call resizeCanvas initially and on window resize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
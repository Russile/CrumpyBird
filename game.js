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
    width: gameWidth * 0.1,
    height: gameWidth * 0.1,
    radius: gameWidth * 0.04,
    velocity: 0,
    gravity: 0.50,
    jump: -7.4,
    rotation: 0
};

let pipes = [];
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let gameOver = false;
let gameStarted = false;
let testMode = false;

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
    return {
        x: gameWidth,
        y: Math.random() * (gameHeight - 200) + 100,
        img: pipeImgs[Math.floor(Math.random() * pipeImgs.length)]
    };
}

// Add this function to calculate distance between two points
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function checkCollision(birdX, birdY, pipeX, pipeTop, pipeBottom) {
    // Check if bird is horizontally aligned with pipe
    if (birdX + bird.radius > pipeX && birdX - bird.radius < pipeX + 50) {
        // Check if bird is too high or too low
        if (birdY - bird.radius < pipeTop || birdY + bird.radius > pipeBottom) {
            return true;
        }
    }
    
    // Check collision with pipe corners
    const corners = [
        {x: pipeX, y: pipeTop},
        {x: pipeX + 50, y: pipeTop},
        {x: pipeX, y: pipeBottom},
        {x: pipeX + 50, y: pipeBottom}
    ];
    
    for (let corner of corners) {
        if (distance(birdX, birdY, corner.x, corner.y) < bird.radius) {
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

function update() {
    if (!gameStarted) return;
    if (gameOver) return;

    frameCount++;

    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    // Update bird image based on velocity
    if (bird.velocity < 0) {
        currentBirdImg = birdImgDown;
    } else if (bird.velocity > bird.gravity) {
        currentBirdImg = birdImgUp;
    } else {
        currentBirdImg = birdImg;
    }

    // Update bird rotation
    if (bird.velocity >= bird.jump) {
        bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 6, bird.velocity * 0.12));
    } else {
        bird.rotation = -Math.PI / 12;
    }

    // In Test Mode, keep the bird on screen
    if (testMode) {
        if (bird.y < bird.radius) bird.y = bird.radius;
        if (bird.y + bird.radius > gameHeight) bird.y = gameHeight - bird.radius;
    } else if (bird.y + bird.radius > gameHeight) {
        gameOver = true;
    }

    // Update background position
    backgroundX -= 3; // Increased from 2 to 3 for faster scrolling
    if (backgroundX <= -backgroundImg.width) {
        backgroundX += backgroundImg.width;
    }

    // Delay pipe generation
    if (frameCount > 100 && (pipes.length === 0 || pipes[pipes.length - 1].x < gameWidth - 200)) {
        pipes.push(createPipe());
    }

    if (!testMode) {
        pipes.forEach(pipe => {
            pipe.x -= 5; // Increased from 3 to 5 for faster pipe movement

            if (checkCollision(bird.x + bird.width / 2, bird.y + bird.height / 2, pipe.x, pipe.y - 75, pipe.y + 75)) {
                gameOver = true;
                updateHighScore();
            }

            if (pipe.x + 50 < bird.x && !pipe.passed) {
                score++;
                pipe.passed = true;
                updateHighScore();
            }
        });
    }

    pipes = pipes.filter(pipe => pipe.x > -50);
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

    // Draw scrolling background with slight overlap
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

    // Draw bird with rotation and current image
    ctx.save();
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    ctx.rotate(bird.rotation);
    ctx.drawImage(currentBirdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    ctx.restore();

    // Draw pipes
    pipes.forEach(pipe => {
        // Draw top pipe
        ctx.save();
        ctx.translate(pipe.x, pipe.y - 75);
        ctx.scale(1, -1);
        ctx.drawImage(pipe.img, 0, 0, 50, 320);
        ctx.restore();

        // Draw bottom pipe
        ctx.drawImage(pipe.img, pipe.x, pipe.y + 75, 50, 320);
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
        ctx.fillText(`Frame Count: ${frameCount}`, 10, 150);
        
        // Add this to show the position of the first pipe
        if (pipes.length > 0) {
            ctx.fillText(`First Pipe X: ${pipes[0].x.toFixed(2)}`, 10, 170);
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
    }
}

document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        handleInput(event);
    } else if (event.code === 'KeyT' && !gameStarted) {
        testMode = !testMode;
    }
});

canvas.addEventListener('touchstart', handleInput);

// Reset game state
function resetGame() {
    bird.y = gameHeight * 0.5;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    gameOver = false;
    gameStarted = false;
    frameCount = 0;
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
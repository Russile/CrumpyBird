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
let birdFlapCounter = 0;

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

// Add this to your image loading section
const pipeCrumpleImg = new Image();
pipeCrumpleImg.src = 'pipe_crumple.png';

function createPipe() {
    const gapHeight = 150; // Adjust this value to change the gap between pipes
    const minHeight = 50; // Minimum height for a pipe
    const maxHeight = gameHeight - gapHeight - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

    return {
        x: gameWidth,
        topHeight: topHeight,
        bottomY: topHeight + gapHeight,
        width: 52, // Adjust based on your pipe image width
        passed: false,
        img: pipeImgs[Math.floor(Math.random() * pipeImgs.length)],
        topDestroyed: false,
        bottomDestroyed: false,
        topCrumpleTime: 0,
        bottomCrumpleTime: 0
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

function checkProjectilePipeCollision(projectile, pipe) {
    // Check if projectile is within the horizontal bounds of the pipe
    if (projectile.x + projectile.radius > pipe.x && 
        projectile.x - projectile.radius < pipe.x + pipe.width) {
        
        // Check if projectile hits the top pipe
        if (!pipe.topDestroyed && projectile.y - projectile.radius < pipe.topHeight) {
            pipe.topDestroyed = true;
            pipe.topCrumpleTime = performance.now();
            return true;
        }
        
        // Check if projectile hits the bottom pipe
        if (!pipe.bottomDestroyed && projectile.y + projectile.radius > pipe.bottomY) {
            pipe.bottomDestroyed = true;
            pipe.bottomCrumpleTime = performance.now();
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

// Add these variables at the top of your file, with your other game variables
let pipeSpeed = 2; // Starting speed
let backgroundSpeed = 1; // Starting background speed
const maxPipeSpeed = 5; // Maximum speed
const maxBackgroundSpeed = 3; // Maximum background speed
const speedIncreaseInterval = 30; // Increase speed every 30 seconds
const speedIncreaseAmount = 0.5; // Amount to increase speed by
let crumples = 3; // Start with full Crumples
const MAX_CRUMPLES = 3;
let projectiles = [];
const PROJECTILE_SPEED = 10; // Increased from 10 to 15
let crumpleButton;
let pipesPassed = 0; // New variable to track passed pipes

// Modify the function to increase both pipe and background speed
function increaseSpeed() {
    if (pipeSpeed < maxPipeSpeed) {
        pipeSpeed = Math.min(pipeSpeed + speedIncreaseAmount, maxPipeSpeed);
        // Scale background speed proportionally
        backgroundSpeed = (pipeSpeed / maxPipeSpeed) * maxBackgroundSpeed;
    }
}

// Add this function to create the Crumple button
function createCrumpleButton() {
    crumpleButton = document.createElement('button');
    crumpleButton.textContent = 'Crumple';
    crumpleButton.style.position = 'absolute';
    crumpleButton.style.bottom = '10px';
    crumpleButton.style.right = '10px';
    crumpleButton.style.display = 'none';
    crumpleButton.addEventListener('click', shootCrumple);
    document.body.appendChild(crumpleButton);
}

// Call this function after the canvas is created
createCrumpleButton();

// Add this function to shoot a Crumple
function shootCrumple() {
    if (crumples > 0 && gameStarted && !gameOver) {
        projectiles.push({
            x: bird.x + bird.width,
            y: bird.y + bird.height / 2,
            radius: 5
        });
        crumples--;
        updateCrumpleButton();
    }
}

// Add this function to update the Crumple button
function updateCrumpleButton() {
    if (crumpleButton) {
        crumpleButton.textContent = `Crumple (${crumples}/${MAX_CRUMPLES})`;
        crumpleButton.style.display = gameStarted && !gameOver ? 'block' : 'none';
    }
}

function update() {
    if (!gameStarted) {
        console.log("Game not started");
        return;
    }
    if (gameOver) {
        console.log("Game over");
        return;
    }

    frameCount++;

    console.log(`Frame: ${frameCount}, Pipes: ${pipes.length}, Projectiles: ${projectiles.length}`);

    // Update bird
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    // Check for collision with top and bottom of the screen
    if (bird.y < 0 || bird.y + bird.height > gameHeight) {
        gameOver = true;
        updateHighScore();
        return;
    }

    // Bird animation
    birdFlapCounter++;
    if (birdFlapCounter % 15 === 0) {  // Change image every 15 frames
        currentBirdImg = (currentBirdImg === birdImgUp) ? birdImgDown : birdImgUp;
    }

    // Update background position
    backgroundX -= backgroundSpeed;
    if (backgroundX <= -backgroundImg.width) {
        backgroundX += backgroundImg.width;
    }

    // Simplified pipe generation
    if (frameCount % 100 === 0) {  // Spawn a pipe every 100 frames
        pipes.push(createPipe());
        console.log('New pipe created');
    }

    // Update pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= pipeSpeed;
        console.log(`Pipe ${i} position: ${pipe.x}`);

        if (pipe.x < -50) {
            pipes.splice(i, 1);
            console.log(`Pipe ${i} removed`);
        }
    }

    const currentTime = performance.now();

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.x += PROJECTILE_SPEED;
        
        let projectileHit = false;
        
        // Check collision with pipes
        for (let j = pipes.length - 1; j >= 0; j--) {
            const pipe = pipes[j];
            if (checkProjectilePipeCollision(projectile, pipe)) {
                console.log('Pipe part hit!');
                projectileHit = true;
                break; // Exit the inner loop after collision
            }
        }

        // Remove projectile if it hit a pipe or if it's off-screen
        if (projectileHit || projectile.x - projectile.radius > gameWidth) {
            projectiles.splice(i, 1);
        }
    }

    // Update and remove crumpled pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        if (pipe.topCrumpleTime && currentTime - pipe.topCrumpleTime > 500) {
            pipe.topDestroyed = true;
            pipe.topCrumpleTime = 0;
        }
        if (pipe.bottomCrumpleTime && currentTime - pipe.bottomCrumpleTime > 500) {
            pipe.bottomDestroyed = true;
            pipe.bottomCrumpleTime = 0;
        }
        if (pipe.topDestroyed && pipe.bottomDestroyed) {
            pipes.splice(i, 1);
        }
    }

    // Check bird collision with pipes
    for (let i = 0; i < pipes.length; i++) {
        const pipe = pipes[i];
        if (bird.x + bird.width > pipe.x && bird.x < pipe.x + pipe.width) {
            if ((!pipe.topDestroyed && bird.y < pipe.topHeight) || 
                (!pipe.bottomDestroyed && bird.y + bird.height > pipe.bottomY)) {
                gameOver = true;
                updateHighScore();
                break;
            }
        }
    }

    // Safeguard to prevent infinite loops
    if (frameCount > 1000000) {
        console.error('Frame count exceeded safe limit. Stopping game.');
        gameOver = true;
        return;
    }
}

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);

    // Update game state at a fixed time step
    while (currentTime - lastUpdateTime >= FIXED_DELTA_TIME * 1000) {
        update();
        lastUpdateTime += FIXED_DELTA_TIME * 1000;

        // Safeguard to prevent infinite loop
        if (currentTime - lastUpdateTime > 1000) {
            console.error('Update loop taking too long. Breaking.');
            break;
        }
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

    const currentTime = performance.now();

    // Draw pipes
    pipes.forEach(pipe => {
        // Draw top pipe
        if (!pipe.topDestroyed || (pipe.topCrumpleTime && currentTime - pipe.topCrumpleTime <= 500)) {
            ctx.save();
            ctx.translate(pipe.x, pipe.topHeight);
            ctx.scale(1, -1);
            if (pipe.topCrumpleTime && currentTime - pipe.topCrumpleTime <= 500) {
                ctx.drawImage(pipeCrumpleImg, 0, 0, pipe.width, pipe.topHeight);
            } else {
                ctx.drawImage(pipe.img, 0, 0, pipe.width, pipe.topHeight);
            }
            ctx.restore();
        }

        // Draw bottom pipe
        if (!pipe.bottomDestroyed || (pipe.bottomCrumpleTime && currentTime - pipe.bottomCrumpleTime <= 500)) {
            if (pipe.bottomCrumpleTime && currentTime - pipe.bottomCrumpleTime <= 500) {
                ctx.drawImage(pipeCrumpleImg, pipe.x, pipe.bottomY, pipe.width, gameHeight - pipe.bottomY);
            } else {
                ctx.drawImage(pipe.img, pipe.x, pipe.bottomY, pipe.width, gameHeight - pipe.bottomY);
            }
        }
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

        ctx.fillText(`Pipe Speed: ${pipeSpeed.toFixed(2)}`, 10, 190);
        ctx.fillText(`Background Speed: ${backgroundSpeed.toFixed(2)}`, 10, 210);
    }

    // Draw projectiles
    ctx.fillStyle = 'yellow';
    projectiles.forEach(projectile => {
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Crumple Meter
    ctx.fillStyle = 'white';
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(`Crumple Meter ${crumples}/${MAX_CRUMPLES}`, gameWidth / 2, gameHeight - 20);
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
    updateCrumpleButton();
}

// Modify the resetGame function to reset both pipe and background speed
function resetGame() {
    bird.y = gameHeight * 0.5;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    pipesPassed = 0; // Reset pipesPassed
    gameOver = false;
    gameStarted = false;
    frameCount = 0;
    pipeSpeed = 2; // Reset pipe speed to initial value
    backgroundSpeed = 1; // Reset background speed to initial value
    crumples = MAX_CRUMPLES; // Start with full Crumples
    projectiles = [];
    updateCrumpleButton();
}

document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        handleInput(event);
    } else if (event.code === 'KeyT' && !gameStarted) {
        testMode = !testMode;
    } else if (event.code === 'KeyB') {
        shootCrumple();
    } else if (event.code === 'KeyR') {
        // Refill Crumples for testing
        crumples = MAX_CRUMPLES;
        updateCrumpleButton();
    }
});

canvas.addEventListener('touchstart', handleInput);

// Ensure all images are loaded before starting the game
Promise.all([
    ...pipeImgs.map(img => img.decode()),
    birdImg.decode(),
    birdImgUp.decode(),
    birdImgDown.decode(),
    backgroundImg.decode(),
    pipeCrumpleImg.decode()
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
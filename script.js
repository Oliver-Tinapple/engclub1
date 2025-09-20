class LaneRunner {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.gameOverElement = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        this.restartBtn = document.getElementById('restartBtn');
        
        // Set up responsive canvas
        this.setupCanvas();
        window.addEventListener('resize', () => this.setupCanvas());
        
        this.gameState = 'playing'; // 'playing' or 'gameOver'
        this.score = 0;
        this.speed = 2;
        
        // Animation variables
        this.animationTime = 0;
        this.autoRestartTimer = 0;
        this.autoRestartDelay = 180; // 3 seconds at 60fps
        
        // Lane setup (will be updated in setupCanvas)
        this.lanes = 3;
        this.laneWidth = 0;
        this.currentLane = Math.floor(this.lanes / 2); // Start in middle lane
        
        // Player setup (will be positioned in setupCanvas)
        this.player = {
            x: 0,
            y: 0,
            width: 120,
            height: 60,
            targetX: 0
        };
        
        // Obstacles
        this.obstacles = [];
        this.obstacleSpawnTimer = 0;
        this.obstacleSpawnRate = 240; // frames between spawns (4 seconds at 60fps)
        
        // Input handling
        this.keys = {};
        this.lastInput = { left: false, right: false };
        this.gamepadIndex = null;
        
        // Load car image
        this.carImage = new Image();
        this.carImage.src = '17-172003_car-clipart-top-view-birds-eye-view-car.png';
        this.imageLoaded = false;
        
        this.carImage.onload = () => {
            this.imageLoaded = true;
        };
        
        this.setupInputHandlers();
        this.gameLoop();
    }
    
    setupCanvas() {
        // Set fixed width, full viewport height
        this.canvas.width = 900;
        this.canvas.height = window.innerHeight;
        
        // Recalculate game dimensions
        this.lanes = 3;
        this.laneWidth = this.canvas.width / this.lanes;
        
        // Initialize or update player position
        if (!this.player) {
            this.player = {
                x: 0,
                y: 0,
                width: 120,
                height: 60,
                targetX: 0
            };
        }
        
        // Update player position to stay at bottom (accounting for fade area)
        this.player.x = this.currentLane * this.laneWidth + this.laneWidth / 2;
        this.player.y = this.canvas.height - 150; // Higher up to avoid bottom fade
        this.player.targetX = this.currentLane * this.laneWidth + this.laneWidth / 2;
    }
    
    setupInputHandlers() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Gamepad detection
        window.addEventListener('gamepadconnected', (e) => {
            this.gamepadIndex = e.gamepad.index;
            console.log('Gamepad connected:', e.gamepad.id);
        });
        
        window.addEventListener('gamepaddisconnected', (e) => {
            if (this.gamepadIndex === e.gamepad.index) {
                this.gamepadIndex = null;
            }
        });
        
        // Restart button
        this.restartBtn.addEventListener('click', () => {
            this.restart();
        });
    }
    
    handleInput() {
        if (this.gameState !== 'playing') return;
        
        let moveLeft = false;
        let moveRight = false;
        
        // Keyboard input
        if (this.keys['a'] || this.keys['arrowleft']) moveLeft = true;
        if (this.keys['d'] || this.keys['arrowright']) moveRight = true;
        
        // Gamepad input
        if (this.gamepadIndex !== null) {
            const gamepad = navigator.getGamepads()[this.gamepadIndex];
            if (gamepad) {
                // D-pad or left stick
                if (gamepad.axes[0] < -0.5 || gamepad.buttons[14]?.pressed) moveLeft = true;
                if (gamepad.axes[0] > 0.5 || gamepad.buttons[15]?.pressed) moveRight = true;
            }
        }
        
        // Only move when input changes from false to true (prevents holding)
        if (moveLeft && !this.lastInput.left && this.currentLane > 0) {
            this.currentLane--;
            this.player.targetX = this.currentLane * this.laneWidth + this.laneWidth / 2;
        }
        if (moveRight && !this.lastInput.right && this.currentLane < this.lanes - 1) {
            this.currentLane++;
            this.player.targetX = this.currentLane * this.laneWidth + this.laneWidth / 2;
        }
        
        // Update last input state
        this.lastInput.left = moveLeft;
        this.lastInput.right = moveRight;
    }
    
    update() {
        this.animationTime++;
        
        if (this.gameState === 'gameOver') {
            this.autoRestartTimer++;
            if (this.autoRestartTimer >= this.autoRestartDelay) {
                this.restart();
            }
            return;
        }
        
        if (this.gameState !== 'playing') return;
        
        this.handleInput();
        
        // Smooth player movement
        this.player.x += (this.player.targetX - this.player.x) * 0.2;
        
        // Keep player at bottom of screen (in case of resize)
        this.player.y = this.canvas.height - 150;
        
        // Spawn obstacles
        this.obstacleSpawnTimer++;
        if (this.obstacleSpawnTimer >= this.obstacleSpawnRate) {
            this.spawnObstacle();
            this.obstacleSpawnTimer = 0;
            
            // Very gradual difficulty increase to keep it accessible
            if (this.obstacleSpawnRate > 180) {
                this.obstacleSpawnRate -= 0.2;
            }
            this.speed += 0.005;
        }
        
        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.y += this.speed;
            
            // Remove obstacles that are off screen
            if (obstacle.y > this.canvas.height) {
                this.obstacles.splice(i, 1);
                this.score += 10;
                continue;
            }
            
            // Check collision
            if (this.checkCollision(this.player, obstacle)) {
                this.gameOver();
                return;
            }
        }
        
        // Update score display
        this.scoreElement.textContent = this.score;
    }
    
    spawnObstacle() {
        const lane = Math.floor(Math.random() * this.lanes);
        const obstacle = {
            x: lane * this.laneWidth + this.laneWidth / 2,
            y: -80,
            width: 140,
            height: 70,
            lane: lane
        };
        this.obstacles.push(obstacle);
    }
    
    checkCollision(player, obstacle) {
        // More forgiving collision detection - reduce collision box by 20%
        const playerPadding = 8;
        const obstaclePadding = 10;
        
        return player.x - (player.width/2 - playerPadding) < obstacle.x + (obstacle.width/2 - obstaclePadding) &&
               player.x + (player.width/2 - playerPadding) > obstacle.x - (obstacle.width/2 - obstaclePadding) &&
               player.y - (player.height/2 - playerPadding) < obstacle.y + (obstacle.height/2 - obstaclePadding) &&
               player.y + (player.height/2 - playerPadding) > obstacle.y - (obstacle.height/2 - obstaclePadding);
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw animated lane lines (brighter and thicker for better visibility)
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 4;
        for (let i = 1; i < this.lanes; i++) {
            const x = i * this.laneWidth;
            const dashOffset = (this.animationTime * this.speed) % 60;
            this.ctx.setLineDash([30, 30]);
            this.ctx.lineDashOffset = -dashOffset;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        this.ctx.setLineDash([]);
        this.ctx.lineDashOffset = 0;
        
        // Draw player
        this.drawPlayer();
        
        // Draw obstacles
        this.obstacles.forEach(obstacle => {
            this.drawObstacle(obstacle);
        });
    }
    
    drawPlayer() {
        const x = this.player.x - this.player.width/2;
        const y = this.player.y - this.player.height/2;
        
        // Simple bounce animation
        const bounce = Math.sin(this.animationTime * 0.1) * 2;
        const adjustedY = y + bounce;
        
        // Simple green rectangle for player
        this.ctx.fillStyle = '#00AA00';
        this.ctx.fillRect(x, adjustedY, this.player.width, this.player.height);
    }
    
    drawObstacle(obstacle) {
        const x = obstacle.x - obstacle.width/2;
        const y = obstacle.y - obstacle.height/2;
        
        // Slight wobble animation for moving cars
        const wobble = Math.sin((this.animationTime + obstacle.y) * 0.2) * 0.5;
        const adjustedX = x + wobble;
        
        // Simple red rectangle for obstacle
        this.ctx.fillStyle = '#CC0000';
        this.ctx.fillRect(adjustedX, y, obstacle.width, obstacle.height);
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.finalScoreElement.textContent = this.score;
        this.gameOverElement.style.display = 'block';
    }
    
    restart() {
        this.gameState = 'playing';
        this.score = 0;
        this.speed = 2;
        this.currentLane = Math.floor(this.lanes / 2);
        this.player.x = this.currentLane * this.laneWidth + this.laneWidth / 2;
        this.player.y = this.canvas.height - 150; // Ensure player stays at bottom
        this.player.targetX = this.player.x;
        this.obstacles = [];
        this.obstacleSpawnTimer = 0;
        this.obstacleSpawnRate = 240;
        this.autoRestartTimer = 0;
        this.gameOverElement.style.display = 'none';
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new LaneRunner();
});
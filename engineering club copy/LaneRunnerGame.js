// Lane Runner Game - p5.js
// Use LEFT and RIGHT arrow keys to dodge falling obstacles
// Includes scoring and restart screen

let playerLane = 1; // 0 = left, 1 = middle, 2 = right
let laneX = [];
let laneY;
let laneWidth;
let playerSize = 50;

let obstacles = [];
let speed = 5;
let score = 0;
let gameOver = false;

function setup() {
  createCanvas(400, 600);
  laneWidth = width / 3;
  laneY = height - 100;
  laneX = [laneWidth / 2, laneWidth * 1.5, laneWidth * 2.5];
  textAlign(CENTER, CENTER);
}

function draw() {
  background(30);

  if (!gameOver) {
    // Draw lanes
    stroke(80);
    for (let i = 1; i < 3; i++) {
      line(i * laneWidth, 0, i * laneWidth, height);
    }

    // Update and draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].y += speed;
      fill(255, 50, 50);
      rectMode(CENTER);
      rect(laneX[obstacles[i].lane], obstacles[i].y, playerSize, playerSize);

      // Check collision
      if (
        obstacles[i].lane === playerLane &&
        dist(laneX[playerLane], laneY, laneX[obstacles[i].lane], obstacles[i].y) < playerSize
      ) {
        gameOver = true;
      }

      // Remove if off screen
      if (obstacles[i].y > height + 50) {
        obstacles.splice(i, 1);
        score++;
      }
    }

    // Draw player
    fill(0, 200, 255);
    noStroke();
    ellipse(laneX[playerLane], laneY, playerSize);

    // Spawn obstacles
    if (frameCount % 60 === 0) {
      obstacles.push({
        lane: floor(random(3)),
        y: -50
      });
    }

    // Display score
    fill(255);
    textSize(24);
    text("Score: " + score, width / 2, 30);
  } else {
    // Game Over screen
    fill(255, 50, 50);
    textSize(40);
    text("GAME OVER", width / 2, height / 2 - 40);
    textSize(24);
    text("Score: " + score, width / 2, height / 2 + 10);
    text("Press ENTER to Restart", width / 2, height / 2 + 60);
  }
}

function keyPressed() {
  if (!gameOver) {
    if (keyCode === LEFT_ARROW) {
      playerLane = max(0, playerLane - 1);
    } else if (keyCode === RIGHT_ARROW) {
      playerLane = min(2, playerLane + 1);
    }
  } else {
    if (keyCode === ENTER) {
      restartGame();
    }
  }
}

function restartGame() {
  gameOver = false;
  obstacles = [];
  score = 0;
  playerLane = 1;
}

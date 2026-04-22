const config = {
  type: Phaser.AUTO,
  width: 400,
  height: 700,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: { preload, create, update }
};

let game = new Phaser.Game(config);

// Game Variables
let player, ground, coins, obstacles;
let cursors, isJumping = false, isSliding = false;
let score = 0, coinCount = 0, gameSpeed = 200;
let gameRunning = false, canSpawn = true;
let lanes = [100, 200, 300];
let currentLane = 1;
let highScore = localStorage.getItem('taunsaHighScore') || 0;

// UI Elements
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const highScoreEl = document.getElementById('high-score');

document.getElementById('start-btn').onclick = startGame;
document.getElementById('restart-btn').onclick = () => location.reload();

function preload() {
  // Colors se kaam chala rahe, images nahi chahiye MVP ke liye
  // Agar chahiye to assets/ folder mein daal ke yahan load karna
}

function create() {
  // Background - Desert theme
  this.cameras.main.setBackgroundColor('#e6c88e');
  
  // Ground
  ground = this.add.rectangle(200, 650, 400, 100, 0xc2a068);
  this.physics.add.existing(ground, true);

  // Player - Neela runner
  player = this.add.rectangle(lanes[currentLane], 550, 40, 0x00aaff);
  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);
  player.body.setSize(40, 60);

  // Groups
  coins = this.physics.add.group();
  obstacles = this.physics.add.group();

  // Collision
  this.physics.add.collider(player, ground);
  this.physics.add.overlap(player, coins, collectCoin, null, this);
  this.physics.add.overlap(player, obstacles, hitObstacle, null, this);

  // Swipe Controls
  let startX, startY;
  this.input.on('pointerdown', (pointer) => {
    startX = pointer.x;
    startY = pointer.y;
  });

  this.input.on('pointerup', (pointer) => {
    if (!gameRunning) return;
    let diffX = pointer.x - startX;
    let diffY = pointer.y - startY;
    
    // Horizontal swipe - Lane change
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 50 && currentLane < 2) {
        currentLane++; // Right
      } else if (diffX < -50 && currentLane > 0) {
        currentLane--; // Left
      }
      player.x = lanes[currentLane];
    } 
    // Vertical swipe
    else {
      if (diffY < -50 &&!isJumping) jump(); // Up = Jump
      if (diffY > 50 &&!isSliding) slide(); // Down = Slide
    }
  });

  // Keyboard for testing on PC
  cursors = this.input.keyboard.createCursorKeys();
}

function update() {
  if (!gameRunning) return;

  // Score badhao
  score += 0.1;
  scoreEl.textContent = `Score: ${Math.floor(score)}`;
  
  // Game tez karo
  if (gameSpeed < 500) gameSpeed += 0.02;

  // Keyboard controls
  if (cursors.left.isDown && currentLane > 0 && canSpawn) {
    currentLane--;
    player.x = lanes[currentLane];
    canSpawn = false;
    setTimeout(() => canSpawn = true, 200);
  }
  if (cursors.right.isDown && currentLane < 2 && canSpawn) {
    currentLane++;
    player.x = lanes[currentLane];
    canSpawn = false;
    setTimeout(() => canSpawn = true, 200);
  }
  if (cursors.up.isDown &&!isJumping) jump();
  if (cursors.down.isDown &&!isSliding) slide();

  // Spawn items
  if (Phaser.Math.Between(0, 100) > 97) spawnItem();

  // Cleanup off-screen items
  coins.children.entries.forEach(coin => {
    if (coin.y > 750) coin.destroy();
  });
  obstacles.children.entries.forEach(obs => {
    if (obs.y > 750) obs.destroy();
  });
}

function startGame() {
  startScreen.classList.add('hidden');
  gameRunning = true;
  score = 0;
  coinCount = 0;
  gameSpeed = 200;
}

function jump() {
  if (isJumping) return;
  isJumping = true;
  player.body.setVelocityY(-500);
  setTimeout(() => { isJumping = false; }, 800);
}

function slide() {
  if (isSliding) return;
  isSliding = true;
  player.height = 30; // Slide = chhota ho jao
  player.y += 15;
  setTimeout(() => {
    player.height = 60;
    player.y -= 15;
    isSliding = false;
  }, 800);
}

function spawnItem() {
  let lane = Phaser.Math.Between(0, 2);
  let x = lanes;
  
  // 60% coin, 40% obstacle
  if (Math.random() > 0.4) {
    let coin = game.scene.scenes[0].add.circle(x, -30, 12, 0xffd700);
    game.scene.scenes[0].physics.add.existing(coin);
    coins.add(coin);
    coin.body.setVelocityY(gameSpeed);
  } else {
    // Obstacle types: Truck, Stone, Barrier
    let type = Phaser.Math.Between(0, 2);
    let obs;
    if (type === 0) obs = game.scene.scenes[0].add.rectangle(x, -40, 50, 0x8B4513); // Truck
    else if (type === 1) obs = game.scene.scenes[0].add.circle(x, -40, 20, 0x808080); // Stone
    else obs = game.scene.scenes[0].add.rectangle(x, -40, 60, 0xff0000); // Barrier
    
    game.scene.scenes[0].physics.add.existing(obs);
    obstacles.add(obs);
    obs.body.setVelocityY(gameSpeed);
    obs.body.setImmovable(true);
  }
}

function collectCoin(player, coin) {
  coin.destroy();
  coinCount++;
  score += 10;
  coinsEl.textContent = `💰 ${coinCount}`;
}

function hitObstacle() {
  if (!gameRunning) return;
  gameRunning = false;
  game.scene.scenes[0].physics.pause();
  
  // High score check
  if (score > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem('taunsaHighScore', highScore);
  }
  
  finalScoreEl.textContent = `Score: ${Math.floor(score)}`;
  highScoreEl.textContent = `High Score: ${highScore}`;
  gameOverScreen.classList.remove('hidden');
    }

  const config = {
  type: Phaser.AUTO,
  width: 400,
  height: 700,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 1200 } // FIX 1: Gravity add ki, jump ke liye zaroori
    }
  },
  scene: { preload, create, update }
};

let game = new Phaser.Game(config);

// Game Variables
let player, ground, coins, obstacles;
let cursors, isJumping = false, isSliding = false;
let score = 0, coinCount = 0, gameSpeed = 200;
let gameRunning = false, canLaneSwitch = true;
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
const uiEl = document.getElementById('ui');

document.getElementById('start-btn').onclick = startGame;
document.getElementById('restart-btn').onclick = () => location.reload();

function preload() {
  // MVP: Colors se kaam chalega
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
  player.body.setSize(35, 55); // Thoda chhota hitbox, fair lage

  // Groups
  coins = this.physics.add.group();
  obstacles = this.physics.add.group();

  // Collision
  this.physics.add.collider(player, ground);
  this.physics.add.overlap(player, coins, collectCoin, null, this);
  this.physics.add.overlap(player, obstacles, hitObstacle, null, this);

  // Swipe Controls - Mobile ke liye
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
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
      if (diffX > 0 && currentLane < 2 && canLaneSwitch) {
        currentLane++; // Right
        switchLane();
      } else if (diffX < 0 && currentLane > 0 && canLaneSwitch) {
        currentLane--; // Left
        switchLane();
      }
    }
    // Vertical swipe
    else if (Math.abs(diffY) > 30) {
      if (diffY < 0 &&!isJumping && player.body.touching.down) jump(); // Up = Jump
      if (diffY > 0 &&!isSliding && player.body.touching.down) slide(); // Down = Slide
    }
  });

  // Keyboard for PC testing
  cursors = this.input.keyboard.createCursorKeys();
}

function update() {
  if (!gameRunning) return;

  // Score badhao
  score += 0.2;
  scoreEl.textContent = `Score: ${Math.floor(score)}`;

  // Game tez karo dheere dheere
  if (gameSpeed < 550) gameSpeed += 0.03;

  // Keyboard controls
  if (cursors.left.isDown && currentLane > 0 && canLaneSwitch) {
    currentLane--;
    switchLane();
  }
  if (cursors.right.isDown && currentLane < 2 && canLaneSwitch) {
    currentLane++;
    switchLane();
  }
  if (cursors.up.isDown &&!isJumping && player.body.touching.down) jump();
  if (cursors.down.isDown &&!isSliding && player.body.touching.down) slide();

  // Spawn items - speed ke hisab se
  if (Phaser.Math.Between(0, 100) > 96) spawnItem.call(this);

  // Cleanup off-screen items + move items
  coins.children.entries.forEach(coin => {
    if (coin.y > 750) coin.destroy();
  });
  obstacles.children.entries.forEach(obs => {
    if (obs.y > 750) obs.destroy();
  });
}

// FIX 2: StartGame bilkul theek kiya
function startGame() {
  startScreen.style.display = 'none'; // Force hide
  uiEl.style.pointerEvents = 'none'; // UI click band
  document.querySelector('.top-bar').style.pointerEvents = 'none';

  gameRunning = true;
  score = 0;
  coinCount = 0;
  gameSpeed = 200;
  coinsEl.textContent = `💰 0`;
}

function switchLane() {
  canLaneSwitch = false;
  player.x = lanes[currentLane];
  setTimeout(() => canLaneSwitch = true, 150); // Spam se bachao
}

function jump() {
  if (isJumping ||!player.body.touching.down) return;
  isJumping = true;
  player.body.setVelocityY(-550);
  this.time.delayedCall(700, () => { isJumping = false; });
}

function slide() {
  if (isSliding ||!player.body.touching.down) return;
  isSliding = true;
  player.setSize(35, 30); // Hitbox chhota
  player.y += 12;
  this.time.delayedCall(600, () => {
    player.setSize(35, 55); // Wapas normal
    player.y -= 12;
    isSliding = false;
  });
}

// FIX 3: SpawnItem mein sabse bada bug tha
function spawnItem() {
  let lane = Phaser.Math.Between(0, 2);
  let x = lanes[lane]; // PEHLE 'lanes' likha tha, 'lanes[lane]' hona chahiye tha 😭

  // 65% coin, 35% obstacle
  if (Math.random() > 0.35) {
    let coin = this.add.circle(x, -30, 12, 0xffd700);
    this.physics.add.existing(coin);
    coins.add(coin);
    coin.body.setVelocityY(gameSpeed);
    coin.body.setGravityY(0); // Coin pe gravity nahi
  } else {
    // Obstacle types: Truck, Stone, Barrier
    let type = Phaser.Math.Between(0, 2);
    let obs;
    if (type === 0) { // Truck
      obs = this.add.rectangle(x, -40, 60, 0x8B4513);
    } else if (type === 1) { // Stone
      obs = this.add.circle(x, -40, 22, 0x808080);
    } else { // Barrier
      obs = this.add.rectangle(x, -40, 70, 0xff0000);
    }

    this.physics.add.existing(obs);
    obstacles.add(obs);
    obs.body.setVelocityY(gameSpeed);
    obs.body.setImmovable(true);
    obs.body.setGravityY(0); // Obstacle pe gravity nahi
  }
}

function collectCoin(player, coin) {
  coin.destroy();
  coinCount++;
  score += 15;
  coinsEl.textContent = `💰 ${coinCount}`;
}

// FIX 4: GameOver screen ka pointer-events theek kiya
function hitObstacle() {
  if (!gameRunning) return;
  gameRunning = false;
  this.physics.pause();

  // High score check
  if (score > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem('taunsaHighScore', highScore);
  }

  finalScoreEl.textContent = `Score: ${Math.floor(score)}`;
  highScoreEl.textContent = `High Score: ${highScore}`;
  gameOverScreen.classList.remove('hidden');
  gameOverScreen.style.pointerEvents = 'all'; // Button dabe ab
  uiEl.style.pointerEvents = 'all'; // UI wapas on
}

// FIX 1: Poore game ko window.onload mein lapet diya - HTML pehle bane
window.onload = function() {

  const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 700,
    parent: 'game-container',
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { y: 1200 }
      }
    },
    scene: { preload, create, update }
  };

  let game = new Phaser.Game(config);

  // Game Variables
  let player, ground, coins, obstacles, scene; // scene variable add kiya
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

  function preload() {}

  function create() {
    scene = this; // FIX 2: Scene ko save kar liya, ab jump/slide mein use hoga
    this.cameras.main.setBackgroundColor('#e6c88e');

    ground = this.add.rectangle(200, 650, 400, 100, 0xc2a068);
    this.physics.add.existing(ground, true);

    player = this.add.rectangle(lanes[currentLane], 550, 40, 0x00aaff);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.body.setSize(35, 55);

    coins = this.physics.add.group();
    obstacles = this.physics.add.group();

    this.physics.add.collider(player, ground);
    this.physics.add.overlap(player, coins, collectCoin, null, this);
    this.physics.add.overlap(player, obstacles, hitObstacle, null, this);

    let startX, startY;
    this.input.on('pointerdown', (pointer) => {
      startX = pointer.x;
      startY = pointer.y;
    });

    this.input.on('pointerup', (pointer) => {
      if (!gameRunning) return;
      let diffX = pointer.x - startX;
      let diffY = pointer.y - startY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
        if (diffX > 0 && currentLane < 2 && canLaneSwitch) {
          currentLane++;
          switchLane();
        } else if (diffX < 0 && currentLane > 0 && canLaneSwitch) {
          currentLane--;
          switchLane();
        }
      }
      else if (Math.abs(diffY) > 30) {
        if (diffY < 0 &&!isJumping && player.body.touching.down) jump();
        if (diffY > 0 &&!isSliding && player.body.touching.down) slide();
      }
    });

    cursors = this.input.keyboard.createCursorKeys();
  }

  function update() {
    if (!gameRunning) return;

    score += 0.2;
    scoreEl.textContent = `Score: ${Math.floor(score)}`;

    if (gameSpeed < 550) gameSpeed += 0.03;

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

    if (Phaser.Math.Between(0, 100) > 96) spawnItem.call(scene);

    coins.children.entries.forEach(coin => {
      if (coin.y > 750) coin.destroy();
    });
    obstacles.children.entries.forEach(obs => {
      if (obs.y > 750) obs.destroy();
    });
  }

  function startGame() {
    startScreen.style.display = 'none';
    uiEl.style.pointerEvents = 'none';
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
    setTimeout(() => canLaneSwitch = true, 150);
  }

  function jump() {
    if (isJumping ||!player.body.touching.down) return;
    isJumping = true;
    player.body.setVelocityY(-550);
    // FIX 3: scene.time use kiya, 'this' nahi
    scene.time.delayedCall(700, () => { isJumping = false; });
  }

  function slide() {
    if (isSliding ||!player.body.touching.down) return;
    isSliding = true;
    player.setSize(35, 30);
    player.y += 12;
    // FIX 4: scene.time use kiya, 'this' nahi
    scene.time.delayedCall(600, () => {
      player.setSize(35, 55);
      player.y -= 12;
      isSliding = false;
    });
  }

  function spawnItem() {
    let lane = Phaser.Math.Between(0, 2);
    let x = lanes; // ✅ Ye pehle hi theek tha

    if (Math.random() > 0.35) {
      let coin = this.add.circle(x, -30, 12, 0xffd700);
      this.physics.add.existing(coin);
      coins.add(coin);
      coin.body.setVelocityY(gameSpeed);
      coin.body.setGravityY(0);
    } else {
      let type = Phaser.Math.Between(0, 2);
      let obs;
      if (type === 0) {
        obs = this.add.rectangle(x, -40, 60, 0x8B4513);
      } else if (type === 1) {
        obs = this.add.circle(x, -40, 22, 0x808080);
      } else {
        obs = this.add.rectangle(x, -40, 70, 0xff0000);
      }
      this.physics.add.existing(obs);
      obstacles.add(obs);
      obs.body.setVelocityY(gameSpeed);
      obs.body.setImmovable(true);
      obs.body.setGravityY(0);
    }
  }

  function collectCoin(player, coin) {
    coin.destroy();
    coinCount++;
    score += 15;
    coinsEl.textContent = `💰 ${coinCount}`;
  }

  function hitObstacle() {
    if (!gameRunning) return;
    gameRunning = false;
    scene.physics.pause();

    if (score > highScore) {
      highScore = Math.floor(score);
      localStorage.setItem('taunsaHighScore', highScore);
    }

    finalScoreEl.textContent = `Score: ${Math.floor(score)}`;
    highScoreEl.textContent = `High Score: ${highScore}`;
    gameOverScreen.classList.remove('hidden');
    gameOverScreen.style.pointerEvents = 'all';
    uiEl.style.pointerEvents = 'all';
  }

}; // window.onload khatam

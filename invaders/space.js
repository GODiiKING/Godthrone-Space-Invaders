// --- CONFIGURATION & SIZING ---
let tileSize = 32;
let rows = 16;
let columns = 44; 

let board;
let boardWidth = tileSize * columns; 
let boardHeight = tileSize * rows;   
let context;

// ship
let shipWidth = tileSize * 3; 
let shipHeight = tileSize * 1.5; 
let shipX = (boardWidth / 2) - (shipWidth / 2);
let shipY = boardHeight - shipHeight - 20; 

let ship = { x: shipX, y: shipY, width: shipWidth, height: shipHeight };
let shipImg;
let shipVelocityX = tileSize; 

// Shooting Mechanics
let isShooting = false;
let shootCooldown = 15;
let shootTimer = 0;

// --- OPTIMIZED AUDIO POOLING ---
const SFX_VOLUME = 0.2; 
const shootPool = Array.from({length: 10}, () => new Audio('./shoot-audio/shootaudio.mp3'));
const deathPool = Array.from({length: 10}, () => new Audio('./enemy-audio/demondie.mp3'));
let shootIdx = 0;
let deathIdx = 0;

let bgMusic = new Audio('./enemy-audio/background.mp3'); 
bgMusic.loop = true;      
bgMusic.volume = 0.1;     

let alienFireSound = new Audio('./enemy-audio/alienDeath.wav'); 
let gameOverSound = new Audio('./enemy-audio/gameOver.wav');
alienFireSound.volume = SFX_VOLUME;
gameOverSound.volume = 0.5;

// assets
let alienArray = [];
let alienWidth = tileSize * 2; 
let alienHeight = tileSize * 2; 
let alienX = tileSize;
let alienY = tileSize; 
let alienImg; 
let bossImg;  

let alienRows = 2;
let alienColumns = 8; 
let alienCount = 0; 
let alienVelocityX = 1; 

// projectiles
let bulletArray = []; 
let bulletVelocityY = -10; 
let alienBulletArray = [];
let baseAlienBulletSpeed = 5; 

// --- LEVEL & UI STATE ---
let score = 0;
let level = 1; 
let levelDisplayTimer = 120; 
let gameOver = false;
let imagesLoaded = 0;
const totalImages = 3; 

// Boss System
const bossData = {
    1: { name: "SHOTGUN BOSS", health: 50, speed: 1.5, img: 'boss' },
    2: { name: "SUPER DEMON", health: 100, speed: 2.0, img: 'minion' },
    3: { name: "VOID WARDEN", health: 150, speed: 2.2, img: 'boss' },
    4: { name: "ELDER IMP", health: 200, speed: 2.5, img: 'minion' },
    5: { name: "NIGHTMARE", health: 250, speed: 2.7, img: 'boss' },
    6: { name: "RAVAGER", health: 300, speed: 3.0, img: 'minion' },
    7: { name: "HELL-TREE", health: 350, speed: 3.2, img: 'boss' },
    8: { name: "DOOM-WING", health: 400, speed: 3.5, img: 'minion' },
    9: { name: "ABYSSAL LORD", health: 500, speed: 3.8, img: 'boss' },
    10: { name: "THE FINAL FEAR", health: 1000, speed: 4.0, img: 'minion' }
};

let activeDialogue = null;
let flags = { hp75: false, hp30: false };

function playDialogue(type) {
    const paths = {
        spawn: './dialogue-audio/[FEAR-howtoplay].mp3',
        hp75: './dialogue-audio/[FEAR-lostchild].mp3',
        hp30: './dialogue-audio/[FEAR-demon].mp3'
    };
    if (activeDialogue) { activeDialogue.pause(); activeDialogue.currentTime = 0; }
    activeDialogue = new Audio(paths[type]);
    activeDialogue.volume = 0.6; 
    activeDialogue.play();
}

window.onload = function() {
    board = document.getElementById("board");
    board.width = boardWidth; 
    board.height = boardHeight;
    context = board.getContext("2d");
    context.imageSmoothingEnabled = false;

    shipImg = new Image(); shipImg.src = "./assets/player.png"; shipImg.onload = checkAssets;
    alienImg = new Image(); alienImg.src = "./assets/demon.png"; alienImg.onload = checkAssets;
    bossImg = new Image(); bossImg.src = "./boss-assets/survivor-shoot_shotgun_0.png"; bossImg.onload = checkAssets;

    document.addEventListener("keydown", (e) => {
        moveShip(e);
        if (e.code === "Space") isShooting = true;
    });
    document.addEventListener("keyup", (e) => {
        if (e.code === "Space") isShooting = false;
    });
    document.addEventListener("mousedown", (e) => { if (e.button === 0) isShooting = true; });
    document.addEventListener("mouseup", (e) => { if (e.button === 0) isShooting = false; });

    if(document.getElementById("newGameBtn")) document.getElementById("newGameBtn").addEventListener("click", () => location.reload());
};

function checkAssets() {
    imagesLoaded++;
    if (imagesLoaded >= totalImages) { createAliens(); requestAnimationFrame(update); }
}

function createAliens() {
    if (level % 2 === 0) {
        let bossIdx = level / 2;
        let cfg = bossData[bossIdx] || bossData[1];
        let bw = tileSize * 8, bh = tileSize * 6;
        alienArray.push({
            x: (boardWidth/2)-(bw/2), y: tileSize, width: bw, height: bh, 
            alive: true, health: cfg.health, maxHealth: cfg.health, isBoss: true, imgType: cfg.img
        });
        alienCount = 1;
        alienVelocityX = cfg.speed;
        flags = { hp75: false, hp30: false };
        playDialogue('spawn');
    } else {
        for (let r = 0; r < alienRows; r++) {
            for (let c = 0; c < alienColumns; c++) {
                alienArray.push({
                    x: alienX + c*(alienWidth+30), y: alienY + r*(alienHeight+20), 
                    width: alienWidth, height: alienHeight, alive: true, health: 1, isBoss: false 
                });
            }
        }
        alienCount = alienArray.length;
        alienVelocityX = 1;
    }
}

function update() {
    if (gameOver) {
        context.fillStyle = "rgba(0, 0, 0, 0.85)"; 
        context.fillRect(0, 0, boardWidth, boardHeight);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "white";
        context.font = "bold 80px 'Courier New', Courier, monospace";
        context.shadowColor = "red"; context.shadowBlur = 25;
        context.fillText("GAME OVER", boardWidth / 2, boardHeight / 2 - 40);
        context.shadowBlur = 0;
        context.font = "bold 24px 'Courier New', Courier, monospace";
        context.fillStyle = "yellow";
        context.fillText("FINAL LEVEL: " + level, boardWidth / 2, boardHeight / 2 + 50);
        context.fillStyle = "white";
        context.fillText("FINAL SCORE: " + score, boardWidth / 2, boardHeight / 2 + 85);
        return; 
    }

    requestAnimationFrame(update);
    context.clearRect(0, 0, board.width, board.height);
    context.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);

    if (isShooting) {
        if (bgMusic.paused) bgMusic.play();
        if (shootTimer <= 0) {
            fireBullet();
            shootTimer = shootCooldown;
        }
    }
    if (shootTimer > 0) shootTimer--;

    for (let i = 0; i < alienArray.length; i++) {
        let alien = alienArray[i];
        if (alien.alive) {
            alien.x += alienVelocityX;
            if (alien.x + alien.width >= board.width || alien.x <= 0) {
                alienVelocityX *= -1;
                if (!alien.isBoss) alienArray.forEach(a => a.y += (alienHeight / 2));
            }
            let img = (alien.isBoss && alien.imgType === 'boss') ? bossImg : alienImg;
            context.drawImage(img, alien.x, alien.y, alien.width, alien.height);

            if (alien.isBoss) {
                context.fillStyle = "red";
                context.fillRect(alien.x, alien.y - 15, alien.width, 10);
                context.fillStyle = "green";
                context.fillRect(alien.x, alien.y - 15, (alien.health / alien.maxHealth) * alien.width, 10);
            }
            if (alien.y + alien.height >= ship.y) endGame();
        }
    }

    // Player Bullets
    for (let i = 0; i < bulletArray.length; i++) {
        let b = bulletArray[i];
        b.y += bulletVelocityY;
        context.fillStyle = "white";
        context.fillRect(b.x, b.y, b.width, b.height);

        for (let j = 0; j < alienArray.length; j++) {
            let alien = alienArray[j];
            if (!b.used && alien.alive && detectCollision(b, alien)) {
                b.used = true;
                alien.health -= 1;
                if (alien.isBoss) {
                    let pct = (alien.health / alien.maxHealth) * 100;
                    if (pct <= 75 && !flags.hp75) { playDialogue('hp75'); flags.hp75 = true; }
                    if (pct <= 30 && !flags.hp30) { playDialogue('hp30'); flags.hp30 = true; }
                }
                if (alien.health <= 0) {
                    alien.alive = false; alienCount--;
                    score += alien.isBoss ? 5000 : 100;
                    if (alien.isBoss && activeDialogue) activeDialogue.pause();
                    playDeathSound();
                }
            }
        }
    }

    // Enemy Shooting Chance
    if (Math.random() < 0.02 && alienArray.length > 0) {
        let aliveAliens = alienArray.filter(a => a.alive);
        if (aliveAliens.length > 0) {
            let randomAlien = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
            let distance = Math.abs((randomAlien.x + randomAlien.width / 2) - (ship.x + ship.width / 2));
            
            // Increased range as levels progress
            let fireRange = (randomAlien.isBoss ? 800 : 450) + (level * 10);

            if (distance < fireRange) fireAlienBullet(randomAlien);
        }
    }

    // Alien Bullets (Stronger Magnetic/Aimed Tracking)
    for (let i = 0; i < alienBulletArray.length; i++) {
        let b = alienBulletArray[i];
        b.x += b.vx; 
        b.y += b.vy; 
        
        context.fillStyle = (level % 2 === 0) ? "orange" : "red";
        context.fillRect(b.x, b.y, b.width, b.height);
        
        if (!b.used && detectCollision(b, getShipHitbox())) endGame();
    }

    bulletArray = bulletArray.filter(b => !b.used && b.y > 0);
    alienBulletArray = alienBulletArray.filter(b => !b.used && b.y < boardHeight && b.x > 0 && b.x < boardWidth);
    
    if (alienCount === 0) nextLevel();

    if (!gameOver) {
        let uiX = 20; let uiY = 20;
        context.fillStyle = "white";
        context.font = "bold 16px 'Courier New', Courier, monospace";
        context.textAlign = "left"; context.textBaseline = "top";
        context.fillText("SCORE: " + score, uiX, uiY);
        context.fillText("LEVEL: " + level, uiX, uiY + 22);

        if (levelDisplayTimer > 0) {
            context.fillStyle = "yellow";
            context.font = "bold 50px 'Courier New', Courier, monospace";
            context.textAlign = "center";
            let title = (level % 2 === 0) ? bossData[level/2]?.name : `LEVEL ${level}`;
            context.fillText(title, boardWidth / 2, boardHeight / 2);
            levelDisplayTimer--;
        }
    }
}

function nextLevel() {
    level++;
    levelDisplayTimer = 120;
    if (activeDialogue) activeDialogue.pause();
    alienArray = []; bulletArray = []; alienBulletArray = [];
    isShooting = false; 
    createAliens();
}

function fireBullet() {
    let s = shootPool[shootIdx];
    s.currentTime = 0; s.volume = SFX_VOLUME; s.play();
    shootIdx = (shootIdx + 1) % shootPool.length;
    bulletArray.push({ x: ship.x + ship.width / 2 - 2, y: ship.y, width: 4, height: 12, used: false });
}

function playDeathSound() {
    let d = deathPool[deathIdx];
    d.currentTime = 0; d.volume = SFX_VOLUME; d.play();
    deathIdx = (deathIdx + 1) % deathPool.length;
}

function fireAlienBullet(alien) {
    alienFireSound.currentTime = 0;
    alienFireSound.play();
    
    let alienCenterX = alien.x + alien.width / 2;
    let alienCenterY = alien.y + alien.height;
    let playerCenterX = ship.x + ship.width / 2;
    let playerCenterY = ship.y + ship.height / 2;

    let dx = playerCenterX - alienCenterX;
    let dy = playerCenterY - alienCenterY;
    let distance = Math.sqrt(dx * dx + dy * dy);

    // --- STRONGER TRACKING MULTIPLIER ---
    // Increased horizontal tracking from 1.5 to 3.5. 
    // Bullets will now travel diagonally much more aggressively.
    let trackingStrength = 3.5 + (level * 0.1); 
    let vx = (dx / distance) * trackingStrength; 
    let vy = (dy / distance) * (baseAlienBulletSpeed + (level * 0.2));

    let w = alien.isBoss ? 10 : 6;
    alienBulletArray.push({ 
        x: alienCenterX, 
        y: alienCenterY, 
        width: w, 
        height: w * 2, 
        vx: vx, 
        vy: vy, 
        used: false 
    });
}

function detectCollision(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function getShipHitbox() { return { x: ship.x + ship.width*0.2, y: ship.y + ship.height*0.2, width: ship.width*0.6, height: ship.height*0.6 }; }

function moveShip(e) {
    if (gameOver) return;
    let k = e.key.toLowerCase();
    if ((k === "a" || e.code === "ArrowLeft") && ship.x > 0) ship.x -= shipVelocityX;
    if ((k === "d" || e.code === "ArrowRight") && ship.x < board.width - ship.width) ship.x += shipVelocityX;
}

function endGame() {
    gameOver = true; 
    bgMusic.pause(); 
    if (activeDialogue) activeDialogue.pause();
    isShooting = false;
    gameOverSound.play();
}
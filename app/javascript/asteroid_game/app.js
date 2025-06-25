const username = window.GAME_CONFIG?.name || 'player';
const level = window.GAME_CONFIG?.level || 'normal';

const gameSettings = {
    easy: { asteroids: 5, speedMultiplier: 1 },
    normal: { asteroids: 7, speedMultiplier: 1.75 },
    hard: { asteroids: 12, speedMultiplier: 3.0 }
};
const noAsteroids = gameSettings[level].asteroids;
const speedMultiplier = gameSettings[level].speedMultiplier;

const arrowKeys = [37, 38, 39, 40];

var startTime, gameTime;
var myGamePiece;
var asteroids = [];
var keys = [];
var gameEnded = false;
var gameStarted = false;

localStorage.setItem('bestScore', 0);

window.addEventListener("keydown", function (e) {
    if (e.keyCode === 13) {
        const scoreControls = document.getElementById("score-controls");
        const scoreFormVisible = scoreControls && scoreControls.style.display === "block";
        
        if (scoreFormVisible) {
          return;
        }

        if (!gameStarted || gameEnded) {
          gameStarted = true;
          gameEnded = false;
          startGame();
        } 
        e.preventDefault();
    }

    if (gameStarted && !gameEnded &&  arrowKeys.includes(e.keyCode)) {
        e.preventDefault();
        keys[e.keyCode] = true;
    }
});

window.addEventListener("keyup", (e) => keys[e.keyCode] = false);
window.addEventListener("resize", resizeGameCanvas);

function getRandomGrey() {
  let greyShade = Math.floor(Math.random() * (240 - 30 + 1)) + 30
  return `rgb(${greyShade}, ${greyShade}, ${greyShade})`;
}

function getRandomPosition(max_pos) {
  let pos = Math.floor(Math.random() * max_pos);
  if(pos >= max_pos/2) 
    pos -= max_pos;
  else if(pos < max_pos/2)
    pos += max_pos;
  return pos;
}

// Function to get a random speed between -5 and 5
function getRandomSpeed() {
  return  (Math.floor((Math.random() - 0.5) * 10)) * speedMultiplier;
}

// Function to format time in minutes:seconds.milliseconds
function formatTime(milliseconds) {
  let min = Math.floor(milliseconds / (60 * 1000)).toString().padStart(2, '0');
  let sec = Math.floor((milliseconds % (60 * 1000)) / 1000).toString().padStart(2, '0');
  let ms= (milliseconds % 1000).toString().padStart(3, '0');

  return `${min}:${sec}.${ms}`;
}

function startGame() {
    gameEnded = false;
    asteroids = [];
    myGamePiece = new component(40, 40, "red", window.innerWidth/2, window.innerHeight/2, "main", 0, 0);
    generateAsteroids(noAsteroids);
    startTime = new Date();
    myGameArea.start();
  }

function generateAsteroids(n) {
    for (var i = 0; i < n; i++) {
        asteroids.push(new component(30, 30, getRandomGrey(), getRandomPosition(window.innerWidth), getRandomPosition(window.innerHeight), "asteroid", getRandomSpeed(), getRandomSpeed()));
    }
}

const myGameArea = {
  canvas : document.createElement("canvas"),
  start : function() {
    this.canvas.id = "myGameCanvas";
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.context = this.canvas.getContext("2d");
    document.body.insertBefore(this.canvas, document.body.childNodes[0]);
    this.frameNo = 0;

    // Update game elements every 20 miliseconds
    this.interval = setInterval(updateGameArea, 20);
    // Generate two asteroids every 15 seconds
    this.generateAsteroidInterval = setInterval(() => generateAsteroids(2), 15000);
  },
  stop : function() {
    clearInterval(this.interval);
    clearInterval(this.generateAsteroidInterval);
    this.clear()
    asteroids = [];
  },
  clear : function() {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

function component(width, height, color, x, y, type, sx, sy) {
  this.type = type;
  this.width = width;
  this.height = height;
  this.speed_x = sx;
  this.speed_y = sy;
  this.x = x;
  this.y = y;

  this.update = function() {
    const ctx = myGameArea.context;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = color;
    ctx.shadowBlur = 5;
    ctx.shadowColor = "white";
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();

    // Display game time
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "right";
    gameTime = new Date() - startTime;
    ctx.fillText(`Time: ${formatTime(gameTime)}`, myGameArea.canvas.width - 10, 40);
    if (!document.getElementById("score-controls"))
      ctx.fillText(`Best score: ${formatTime(localStorage.getItem('bestScore'))}`, myGameArea.canvas.width - 10, 70);
  }

  // Method to calculate the new position of the component
  this.newPos = function() {
      if (this.x - this.width / 2 < 0)
        this.speed_x = Math.random() * 4 + 1;
      else if ((this.x + this.width / 2) >= myGameArea.context.canvas.width)
        this.speed_x = -Math.random() * 4 - 1;
      if (this.y - this.height / 2 < 0)
        this.speed_y = -Math.random() * 4 - 1;
      else if ((this.y + this.height / 2) >= myGameArea.context.canvas.height)
        this.speed_y = Math.random() * 4 + 1;
      this.x += this.speed_x;
      this.y -= this.speed_y;
  }
  // Method to move the component with arrow keys
  this.moveWithArrows = function () {
    // Left arrow key
    if (keys[37]) {
      this.x -= 5; 
      if (this.x < 0) this.x = myGameArea.canvas.width; // If piece on left border
    } 
    // Right arrow key
    if (keys[39]) {
      this.x += 5; 
      if (this.x > myGameArea.canvas.width) this.x = 0; // If piece on right border
    }
    // Up arrow key
    if (keys[38]) {
      this.y -= 5; 
      if (this.y < 0) this.y = myGameArea.canvas.height; // If piece on top border
    }
    // Down arrow key
    if (keys[40]) {
      this.y += 5;  
      if (this.y > myGameArea.canvas.height) this.y = 0; // If piece on bottom border
    }
  }
}

function updateGameArea() {
  if(gameEnded) {
    gameOver();
    return;
  } 

  myGameArea.clear();
  myGamePiece.moveWithArrows();
  myGamePiece.update();

  for (var i = 0; i < asteroids.length; i++) {
    asteroids[i].newPos();
    asteroids[i].update();

    // Check collision with myGamePiece
    if (checkCollision(myGamePiece, asteroids[i])) {
      gameEnded = true;
      gameTime = new Date() - startTime;
      return;
    }

    // Check collision with other asteroids
    for (var j = i + 1; j < asteroids.length; j++) {
      if (checkCollision(asteroids[i], asteroids[j])) {
        asteroids[i].speed_x = -asteroids[i].speed_x;
        asteroids[i].speed_y = -asteroids[i].speed_y;
      
        asteroids[j].speed_x = -asteroids[j].speed_x;
        asteroids[j].speed_y = -asteroids[j].speed_y;
      }
    }
  }
}

function checkCollision(content1, content2) {
    return(
      content1.x < content2.x + content2.width &&
      content1.x + content1.width > content2.x &&
      content1.y < content2.y + content2.height &&
      content1.y + content1.height > content2.y 
    );
  }

function resizeGameCanvas() {
    let oldWidth = myGameArea.canvas.width;
    let oldHeight = myGameArea.canvas.height;

    myGameArea.canvas.width = window.innerWidth;
    myGameArea.canvas.height = window.innerHeight;

    let widthRatio = myGameArea.canvas.width / oldWidth;
    let heightRatio = myGameArea.canvas.height / oldHeight;

    if (gameStarted) {
        myGamePiece.x *= widthRatio;
        myGamePiece.y *= heightRatio;
    }

    asteroids.forEach(asteroid => {
        asteroid.x *= widthRatio;
        asteroid.y *= heightRatio;
    });

    if (!gameStarted) {
        showStartScreen();
    } else if (gameEnded) {
        gameOver();
    }
}

function gameOver() {
    myGameArea.stop();

    const width = window.innerWidth / 2;
    const height = window.innerHeight / 2;
    const ctx = myGameArea.context;

    const scoreControls = document.getElementById("score-controls");
    const scoreInput = document.getElementById("score-input");

    ctx.fillStyle = "red";
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", width, height);

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "right";
    ctx.fillText("Time: " + formatTime(gameTime), myGameArea.canvas.width - 10, 40);

    if (scoreControls) {
      const bestScoreInSeconds = gameTime / 1000;
      const winSeconds = level === 'hard' ? 20 : 50;

      const normalizedScore = Math.min(bestScoreInSeconds / winSeconds, 1.0).toFixed(4);
      scoreInput.value = normalizedScore;

      scoreControls.style.display = "block";
      scoreControls.style.position = "absolute";
      scoreControls.style.left = `${width}px`;
      scoreControls.style.top = `${height + 50}px`;
      scoreControls.style.transform = "translate(-50%, 0)";
    } else {
      if(gameTime > Number(localStorage.getItem('bestScore')))
          localStorage.setItem('bestScore', gameTime);

      ctx.fillStyle = "white";
      ctx.font = "20px Arial";
      ctx.textAlign = "right";
      ctx.fillText("Best score: " + formatTime(Number(localStorage.getItem('bestScore'))), myGameArea.canvas.width - 10, 70);
      ctx.textAlign = "center";
      ctx.fillText("Press Enter to start a new game.", width, height+ 50);
    }

}

function showStartScreen() {
    myGameArea.canvas.id = "myGameCanvas";
    myGameArea.canvas.width = window.innerWidth;
    myGameArea.canvas.height = window.innerHeight;
    myGameArea.context = myGameArea.canvas.getContext("2d");
    document.body.insertBefore(myGameArea.canvas, document.body.childNodes[0]);
  
    const ctx = myGameArea.context;     
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, myGameArea.canvas.width, myGameArea.canvas.height);
  
    ctx.fillStyle = "white";
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Asteroid Game", myGameArea.canvas.width / 2, myGameArea.canvas.height / 3);
  
    ctx.font = "20px Arial";
    if (document.getElementById("score-controls"))
      ctx.fillText(`[ Game mode: ${level} ]`, myGameArea.canvas.width / 2, myGameArea.canvas.height / 3 + 50);

    if (username.trim() !== '') {
        ctx.fillText(`Welcome, ${username}!`, myGameArea.canvas.width / 2, myGameArea.canvas.height / 3 - 50);
    }
    ctx.fillText("Use arrow keys to move.", myGameArea.canvas.width / 2, myGameArea.canvas.height / 2 + 100);
    ctx.fillText("Press ENTER to start.", myGameArea.canvas.width / 2, myGameArea.canvas.height / 2 + 130);
  }


window.onload = showStartScreen;

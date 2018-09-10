'use strict';
import io from 'socket.io-client';
import $ from 'jquery';

const socket = io('http://localhost:3000');
const canvas = $('#rader')[0];
canvas.width = 500;
canvas.height = 500;
const ctx = canvas.getContext('2d');
const canvas2 = $('#score')[0];
canvas2.width = 300;
canvas2.height = 300;
const ctx2 = canvas2.getContext('2d');

const gameObj = {
    playersMap: new Map(),
    itemsMap: new Map(),
    airMap: new Map(),
    itemRadius: 4,
    airRadius: 5,
    missileTimeFlame: 3,
    fieldWidth: null,
    fieldHeight: null,
    bomCellPx: 32,
    counter: 0
};

init();
function init() {
    // 潜水艦の画像
    const submarineImage = new Image();
    submarineImage.src = '/images/submarine2.png';
    gameObj.submarineImage = submarineImage;

    // ミサイルの画像
    const missileImage = new Image();
    missileImage.src = '/images/missile.png';
    gameObj.missileImage = missileImage;

    // 爆発の画像集
    const bomListImage = new Image();
    bomListImage.src = '/images/bomlist.png';
    gameObj.bomListImage = bomListImage;
}

let deg = 0;

function ticker() {
    if (!gameObj.myPlayerObj) return;
    if (gameObj.myPlayerObj.isAlive === false && gameObj.myPlayerObj.deadCount > 20) {
       drawGameOver();
       return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height); // まっさら
    drawRadar();
    drawMap(ctx, gameObj.playersMap, gameObj.itemsMap, gameObj.airMap, gameObj.myPlayerObj, gameObj.flyingMissiles);
    drawSubmarine(ctx, gameObj.myPlayerObj);
    drawAirTimer(ctx2, gameObj.myPlayerObj.airTime);
    drawMissiles(ctx2, gameObj.myPlayerObj.missilesMany);
    drawScore(ctx2, gameObj.myPlayerObj.score);
    gameObj.missileTimeFlame -= 1;
    gameObj.counter = (gameObj.counter + 1) % 10000;
}
setInterval(ticker, 33);

function drawGameOver() {
   ctx.font = 'bold 76px arial black';
   ctx.fillStyle = "rgb(0, 220, 250)";
   ctx.fillText('Game Over', 20, 270);
   ctx.fillStyle = "rgb(0, 0, 0)";
   ctx.lineWidth = 3;
   ctx.strokeText('Game Over', 20, 270);
}

const x = canvas.width / 2;
const y = canvas.height / 2;
const r = canvas.width * 1.5 / 2;
function drawRadar() {
    ctx.save(); // セーブ

    ctx.beginPath();
    ctx.translate(x, y);
    ctx.rotate(deg * Math.PI / 180 );
    ctx.translate(-x, -y);

    /* グラデーション領域をセット */
    const grad  = ctx.createLinearGradient(x, y, x + x /3, y/3);
    /* グラデーション終点のオフセットと色をセット */
    grad.addColorStop(0,'rgba(0, 220, 0, 0)');
    grad.addColorStop(0.1,'rgba(0, 220, 0, 0)');
    //grad.addColorStop(0.9,'rgba(0, 200, 0, 0.4)');
    grad.addColorStop(1,'rgba(0, 220, 0, 0.5)');
    /* グラデーションをfillStyleプロパティにセット */
    ctx.fillStyle = grad;

    ctx.arc(x, y, r, getRadian(0), getRadian(-30), true);
    ctx.lineTo(x, y);

    ctx.fill();

    ctx.restore(); // 元の設定を取得
    deg += 3;
}

const rotationDegreeByFlyingMissileDirection = {
    'left': 270, 'up': 0, 'down': 180, 'right': 90
};
function drawMap(ctx, playersMap, itemsMap, airMap, myPlayerObj, flyingMissiles) {

   // 敵プレイヤーの描画
   for (let [key, tekiPlayerObj] of playersMap) {
      if (key === myPlayerObj.socketId) { continue; } // 自分は描画しない

      const distanceObj = calculationBetweenTwoPoints(
         myPlayerObj.x, myPlayerObj.y, tekiPlayerObj.x, tekiPlayerObj.y, gameObj.fieldWidth, gameObj.fieldHeight, canvas.width, canvas.height
      );

      if (distanceObj.distanceX <= (canvas.width / 2) && distanceObj.distanceY <= (canvas.height / 2)) {

         if (tekiPlayerObj.isAlive === true) {

            const drawRadius   = gameObj.counter % 12 + 2 + 12;
            const clearRadius  = drawRadius - 2;
            const drawRadius2  = gameObj.counter % 12 + 2;
            const clearRadius2 = drawRadius2 - 2;

            ctx.fillStyle = "rgb(255, 0, 0)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = "rgb(0, 20, 50)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = "rgb(255, 0, 0)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius2, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = "rgb(0, 20, 50)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius2, 0, Math.PI*2, true);
            ctx.fill();

         } else if (tekiPlayerObj.isAlive === false) {

            drawBom(distanceObj.drawX, distanceObj.drawY, tekiPlayerObj.deadCount);

         }
      }
   }

   // 飛んでいるミサイルの描画
   for (let flyingMissile of flyingMissiles) {

      const distanceObj = calculationBetweenTwoPoints(
         myPlayerObj.x, myPlayerObj.y, flyingMissile.x, flyingMissile.y, gameObj.fieldWidth, gameObj.fieldHeight, canvas.width, canvas.height
      );

      if (
         distanceObj.distanceX <= (canvas.width / 2 + 50) &&
         distanceObj.distanceY <= (canvas.height / 2 + 50)
         ) {

         if (flyingMissile.emitPlayerId === myPlayerObj.socketId) { // 自分自身

            const rotationDegree = rotationDegreeByFlyingMissileDirection[flyingMissile.direction];
            ctx.save();
            ctx.translate(distanceObj.drawX, distanceObj.drawY);
            ctx.rotate(getRadian(rotationDegree));
            ctx.drawImage(
               gameObj.missileImage,
               - gameObj.missileImage.width / 2,
               - gameObj.missileImage.height / 2
            );
            ctx.restore();

         } else {

            const drawRadius1   = gameObj.counter % 8 + 2 + 20;
            const clearRadius1  = drawRadius1 - 2;
            const drawRadius2  = gameObj.counter % 8 + 2 + 10;
            const clearRadius2 = drawRadius2 - 2;
            const drawRadius3  = gameObj.counter % 8 + 2 + 0;
            const clearRadius3 = drawRadius3 - 2;

            ctx.fillStyle = "rgb(255, 0, 0)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius1, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = "rgb(0, 20, 50)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius1, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = "rgb(255, 0, 0)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius2, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = "rgb(0, 20, 50)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius2, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = "rgb(255, 0, 0)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius3, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = "rgb(0, 20, 50)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius3, 0, Math.PI*2, true);
            ctx.fill();
         }
      }
   }

    // アイテムの描画
    for (const item of itemsMap.values()) {

        const distanceObj = calculationBetweenTwoPoints(
            myPlayerObj.x, myPlayerObj.y, item.x, item.y, gameObj.fieldWidth, gameObj.fieldHeight, canvas.width, canvas.height
        );

        if (distanceObj.distanceX <= (canvas.width / 2) && distanceObj.distanceY <= (canvas.height / 2)) {
            ctx.fillStyle = "rgb(255, 165, 0)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, gameObj.itemRadius, 0, Math.PI*2, true);
            ctx.fill();
        }
    }

    // 空気の描画
    for (const [airKey, airObj] of airMap) {

        const distanceObj = calculationBetweenTwoPoints(
            myPlayerObj.x, myPlayerObj.y, airObj.x, airObj.y, gameObj.fieldWidth, gameObj.fieldHeight, canvas.width, canvas.height
        );

        if (distanceObj.distanceX <= (canvas.width / 2) && distanceObj.distanceY <= (canvas.height / 2)) {
            ctx.fillStyle = "rgb(0, 220, 255)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, gameObj.airRadius, 0, Math.PI*2, true);
            ctx.fill();
        }
    }
}

function calculationBetweenTwoPoints(pX, pY, oX, oY, gameWidth, gameHeight, canvasWidth, canvasHeight) {
    let distanceX = 99999999;
    let distanceY = 99999999;
    let drawX = null;
    let drawY = null;

    if (pX <= oX) {
        // 右から
        distanceX = oX - pX;
        drawX = (canvasWidth / 2) + distanceX;
        // 左から
        let tmpDistance = pX + gameWidth - oX;
        if (distanceX > tmpDistance) {
            distanceX = tmpDistance;
            drawX = (canvasWidth / 2) - distanceX;
        }

    } else {
        // 右から
        distanceX = pX - oX;
        drawX = (canvasWidth / 2) - distanceX;
        // 左から
        let tmpDistance = oX + gameWidth - pX;
        if (distanceX > tmpDistance) {
            distanceX = tmpDistance;
            drawX = (canvasWidth / 2) + distanceX;
        }
    }

    if (pY <= oY) {
        // 下から
        distanceY = oY - pY;
        drawY = (canvasHeight / 2) + distanceY;
        // 上から
        let tmpDistance = pY + gameHeight - oY;
        if (distanceY > tmpDistance) {
            distanceY = tmpDistance;
            drawY = (canvasHeight / 2) - distanceY;
        }

    } else {
        // 上から
        distanceY = pY - oY;
        drawY = (canvasHeight / 2) - distanceY;
        // 下から
        let tmpDistance = oY + gameHeight - pY;
        if (distanceY > tmpDistance) {
            distanceY = tmpDistance;
            drawY = (canvasHeight / 2) + distanceY;
        }
    }

    return {
        distanceX,
        distanceY,
        drawX,
        drawY
    };
}

const rotationDegreeByDirection = {
    'left': 0, 'up': 270, 'down': 90, 'right': 0
};
function drawSubmarine(ctx, myPlayerObj){
    if (myPlayerObj.isAlive === true) {

        const rotationDegree = rotationDegreeByDirection[myPlayerObj.direction];

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(getRadian(rotationDegree));
        if (myPlayerObj.direction === 'left') {
            ctx.scale(-1, 1);
        }
        ctx.drawImage(
            gameObj.submarineImage,
            -(gameObj.submarineImage.width / 2),
            -(gameObj.submarineImage.height / 2)
        );
        ctx.restore();

    } else {

        const drawX = canvas.width / 2  - gameObj.bomCellPx / 2;
        const drawY = canvas.height / 2 - gameObj.bomCellPx / 2;
        drawBom(drawX, drawY, myPlayerObj.deadCount);

    }
}

function drawBom(drawX, drawY, deadCount) {
   if (deadCount >= 20) return;

   const drawBomNumber = Math.floor(deadCount / 2);
   const cropX = (drawBomNumber % (gameObj.bomListImage.width / gameObj.bomCellPx)) * gameObj.bomCellPx;
   const cropY = Math.floor(drawBomNumber / (gameObj.bomListImage.width / gameObj.bomCellPx)) * gameObj.bomCellPx;

   ctx.drawImage(
      gameObj.bomListImage,
      cropX,cropY,
      gameObj.bomCellPx, gameObj.bomCellPx,
      drawX, drawY,
      gameObj.bomCellPx, gameObj.bomCellPx
   ); // 画像データ、切り抜き左、切り抜き上、幅、幅、表示x、表示y、幅、幅
}

function sendChangeDirection(socket, direction) {
    socket.emit('change direction', direction);
}

function sendMissileEmit(socket, direction) {
    socket.emit('missile emit', direction);
}

function drawMissiles(ctx2, missilesMany) {
    for (let i = 0; i < missilesMany; i++) {
        ctx2.drawImage(gameObj.missileImage, 50 * i, 80);
    }
}

function drawAirTimer(ctx2, airTime) {
   ctx2.clearRect(0, 0, canvas2.width, canvas2.height); // まっさら
   ctx2.fillStyle = "rgb(0, 220, 250)";
   ctx2.font = 'bold 40px Arial';
   ctx2.fillText(airTime, 110, 50);
}

function drawScore(ctx2, score) {
    ctx2.fillStyle = "rgb(26, 26, 26)";
    ctx2.font = '28px Arial';
    ctx2.fillText(`score: ${score}`, 10, 180);
}


socket.on('start data', (startObj) => {
    gameObj.myPlayerObj  = startObj.playerObj;
    gameObj.fieldWidth   = startObj.fieldWidth;
    gameObj.fieldHeight  = startObj.fieldHeight;
});

socket.on('map data', (mapData) => {
    gameObj.playersMap = new Map(mapData.playersMap);
    gameObj.itemsMap = new Map(mapData.itemsMap);
    gameObj.airMap = new Map(mapData.airMap);
    gameObj.flyingMissiles = mapData.flyingMissiles;
    gameObj.myPlayerObj = gameObj.playersMap.get(gameObj.myPlayerObj.socketId); // 自分の情報も更新

    //drawMap(ctx, gameObj.playersMap, gameObj.itemsMap, gameObj.airMap, gameObj.myPlayerObj);
    //drawSubmarine(ctx, gameObj.myPlayerObj.direction);
    //drawMissiles(gameObj.myPlayerObj.missilesMany);
});


$(window).keydown(function(event){
    if (!gameObj.myPlayerObj || gameObj.myPlayerObj.isAlive === false) return;

    switch(event.key) {
        case 'ArrowLeft':
            if (gameObj.myPlayerObj.direction === 'left') break; // 変わってない
            gameObj.myPlayerObj.direction = 'left';
            drawSubmarine(ctx, 'left');
            sendChangeDirection(socket, 'left');
            break;
        case 'ArrowUp':
            if (gameObj.myPlayerObj.direction === 'up') break; // 変わってない
            gameObj.myPlayerObj.direction = 'up';
            drawSubmarine(ctx, 'up');
            sendChangeDirection(socket, 'up');
            break;
        case 'ArrowDown':
            if (gameObj.myPlayerObj.direction === 'down') break; // 変わってない
            gameObj.myPlayerObj.direction = 'down';
            drawSubmarine(ctx, 'down');
            sendChangeDirection(socket, 'down');
            break;
        case 'ArrowRight':
            if (gameObj.myPlayerObj.direction === 'right') break; // 変わってない
            gameObj.myPlayerObj.direction = 'right';
            drawSubmarine(ctx, 'right');
            sendChangeDirection(socket, 'right');
            break;
        case ' ': // スペースキー
            if (gameObj.myPlayerObj.missilesMany <= 0) break; // ミサイルのストックが 0
            if (gameObj.missileTimeFlame > 0) break; // ミサイル撃ちたての時
            gameObj.missileTimeFlame = 3;
            sendMissileEmit(socket, gameObj.myPlayerObj.direction);
            break;
    }
});


function getRadian(kakudo) {
    return kakudo * Math.PI / 180
}

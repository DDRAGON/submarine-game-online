'use strict';
import io from 'socket.io-client';
import $ from 'jquery';

const socket = io('http://localhost:9000');
const canvas = $('#rader')[0];
canvas.width = 500;
canvas.height = 500;
const ctx = canvas.getContext('2d');
const canvas2 = $('#score')[0];
canvas2.width = 300;
canvas2.height = 500;
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
    myDisplayName: $('#main').attr('data-displayName'),
    myThumbUrl: $('#main').attr('data-thumbUrl'),
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

    // Twitter アイコン
    if (gameObj.myThumbUrl && gameObj.myThumbUrl !== 'anonymous') {
        const twitterImage = new Image();
        twitterImage.src = gameObj.myThumbUrl;
        gameObj.twitterImage = twitterImage;
    }
}

let deg = 0;

function ticker() {
    if (!gameObj.myPlayerObj) return;
    if (gameObj.myPlayerObj.isAlive === false && gameObj.myPlayerObj.deadCount > 20) {
       drawGameOver();
       //return;
    }

    const playerAndAiMap = new Map(Array.from(gameObj.playersMap).concat(Array.from(gameObj.AIMap)));

    ctx.clearRect(0, 0, canvas.width, canvas.height); // まっさら
    drawRadar();
    //drawBorder(ctx, gameObj.myPlayerObj, gameObj.fieldWidth, gameObj.fieldHeight);
    drawMap(ctx, playerAndAiMap, gameObj.itemsMap, gameObj.airMap, gameObj.myPlayerObj, gameObj.flyingMissilesMap);
    drawSubmarine(ctx, gameObj.myPlayerObj);
    drawAirTimer(ctx2, gameObj.myPlayerObj.airTime);
    drawMissiles(ctx2, gameObj.myPlayerObj.missilesMany);
    drawScore(ctx2, gameObj.myPlayerObj.score);
    drawRanking(ctx2, playerAndAiMap);
    gameObj.missileTimeFlame -= 1;
    gameObj.counter = (gameObj.counter + 1) % 10000;
}
setInterval(ticker, 33);

function drawBorder(ctx, myPlayerObj, fieldWidth, fieldHeight) {
   const distanceObj = calculationBetweenTwoPoints(
      myPlayerObj.x, myPlayerObj.y, 0, 0, gameObj.fieldWidth, gameObj.fieldHeight, canvas.width, canvas.height
   );

   ctx.fillStyle = "rgb(255, 255, 255)";
   ctx.fillRect(distanceObj.drawX, distanceObj.drawY, 1, gameObj.fieldHeight);
   ctx.fillRect(distanceObj.drawX, distanceObj.drawY, gameObj.fieldWidth, 1);

}

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
    deg = (deg + 5) % 360;
}

const rotationDegreeByFlyingMissileDirection = {
    'left': 270, 'up': 0, 'down': 180, 'right': 90
};
function drawMap(ctx, playerAndAiMap, itemsMap, airMap, myPlayerObj, flyingMissilesMap) {

   // 敵プレイヤーとAIの描画
   for (let [key, tekiPlayerObj] of playerAndAiMap) {
      if (key === myPlayerObj.socketId) { continue; } // 自分は描画しない

      const distanceObj = calculationBetweenTwoPoints(
         myPlayerObj.x, myPlayerObj.y, tekiPlayerObj.x, tekiPlayerObj.y, gameObj.fieldWidth, gameObj.fieldHeight, canvas.width, canvas.height
      );

      if (distanceObj.distanceX <= (canvas.width / 2) && distanceObj.distanceY <= (canvas.height / 2)) {

         if (tekiPlayerObj.isAlive === true) {

            const degreeDiff = calcDegreeDiffFromRadar(deg, distanceObj.degree);
            const toumeido = calcOpacity(degreeDiff);

            const drawRadius   = gameObj.counter % 12 + 2 + 12;
            const clearRadius  = drawRadius - 2;
            const drawRadius2  = gameObj.counter % 12 + 2;
            const clearRadius2 = drawRadius2 - 2;

            ctx.fillStyle = `rgba(255, 0, 0, ${toumeido})`;
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = `rgb(0, 20, 50)`;
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 0, 0, ${toumeido})`;
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius2, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = `rgb(0, 20, 50)`;
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius2, 0, Math.PI*2, true);
            ctx.fill();

            if (tekiPlayerObj.displayName === 'CPU') {

               ctx.strokeStyle = `rgba(250, 250, 250, ${toumeido})`;
               ctx.fillStyle = `rgba(250, 250, 250, ${toumeido})`;
               ctx.beginPath();
               ctx.moveTo(distanceObj.drawX, distanceObj.drawY);
               ctx.lineTo(distanceObj.drawX + 25, distanceObj.drawY - 25);
               ctx.lineTo(distanceObj.drawX + 25 + 25, distanceObj.drawY - 25);
               ctx.stroke();

               ctx.font = '12px Arial';
               ctx.fillText('CPU', distanceObj.drawX + 25, distanceObj.drawY - 25 - 1);

            } else if (tekiPlayerObj.displayName === 'anonymous') {

               ctx.strokeStyle = `rgba(250, 250, 250, ${toumeido})`;
               ctx.fillStyle = `rgba(250, 250, 250, ${toumeido})`;
               ctx.beginPath();
               ctx.moveTo(distanceObj.drawX, distanceObj.drawY);
               ctx.lineTo(distanceObj.drawX + 20, distanceObj.drawY - 20);
               ctx.lineTo(distanceObj.drawX + 20 + 40, distanceObj.drawY - 20);
               ctx.stroke();

               ctx.font = '8px Arial';
               ctx.fillText('anonymous', distanceObj.drawX + 20, distanceObj.drawY - 20 - 1);

            } else if (tekiPlayerObj.displayName) {

               ctx.strokeStyle = `rgba(250, 250, 250, ${toumeido})`;
               ctx.fillStyle = `rgba(250, 250, 250, ${toumeido})`;
               ctx.beginPath();
               ctx.moveTo(distanceObj.drawX, distanceObj.drawY);
               ctx.lineTo(distanceObj.drawX + 20, distanceObj.drawY - 20);
               ctx.lineTo(distanceObj.drawX + 20 + 40, distanceObj.drawY - 20);
               ctx.stroke();

               ctx.font = '8px Arial';
               ctx.fillText(tekiPlayerObj.displayName, distanceObj.drawX + 20, distanceObj.drawY - 20 - 1);

            }

         } else if (tekiPlayerObj.isAlive === false) {

            drawBom(distanceObj.drawX, distanceObj.drawY, tekiPlayerObj.deadCount);

         }
      }
   }

   // 飛んでいるミサイルの描画
   for (let [missileId, flyingMissile] of flyingMissilesMap) {

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

            ctx.strokeStyle = "rgba(250, 250, 250, 0.9)";
            ctx.fillStyle = "rgba(250, 250, 250, 0.9)";
            ctx.beginPath();
            ctx.moveTo(distanceObj.drawX, distanceObj.drawY);
            ctx.lineTo(distanceObj.drawX + 20, distanceObj.drawY - 20);
            ctx.lineTo(distanceObj.drawX + 20 + 35, distanceObj.drawY - 20);
            ctx.stroke();

            ctx.font = '11px Arial';
            ctx.fillText('missile', distanceObj.drawX + 20, distanceObj.drawY - 20 - 2);

         } else {

            const degreeDiff = calcDegreeDiffFromRadar(deg, distanceObj.degree);
            const toumeido = calcOpacity(degreeDiff);

            const drawRadius1   = gameObj.counter % 8 + 2 + 20;
            const clearRadius1  = drawRadius1 - 2;
            const drawRadius2  = gameObj.counter % 8 + 2 + 10;
            const clearRadius2 = drawRadius2 - 2;
            const drawRadius3  = gameObj.counter % 8 + 2 + 0;
            const clearRadius3 = drawRadius3 - 2;

            ctx.fillStyle = `rgba(255, 0, 0, ${toumeido})`;
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius1, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = "rgb(0, 20, 50)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius1, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 0, 0, ${toumeido})`;
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius2, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = "rgb(0, 20, 50)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius2, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 0, 0, ${toumeido})`;
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius3, 0, Math.PI*2, true);
            ctx.fill();

            ctx.fillStyle = "rgb(0, 20, 50)";
            ctx.beginPath();
            ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius3, 0, Math.PI*2, true);
            ctx.fill();

            ctx.strokeStyle = `rgba(250, 250, 250, ${toumeido})`;
            ctx.fillStyle = `rgba(250, 250, 250, ${toumeido})`;
            ctx.beginPath();
            ctx.moveTo(distanceObj.drawX, distanceObj.drawY);
            ctx.lineTo(distanceObj.drawX + 30, distanceObj.drawY - 30);
            ctx.lineTo(distanceObj.drawX + 30 + 35, distanceObj.drawY - 30);
            ctx.stroke();

            ctx.font = '11px Arial';
            ctx.fillText('missile', distanceObj.drawX + 30, distanceObj.drawY - 30 - 2);
         }
      }
   }

    // アイテムの描画
    for (const item of itemsMap.values()) {

        const distanceObj = calculationBetweenTwoPoints(
            myPlayerObj.x, myPlayerObj.y, item.x, item.y, gameObj.fieldWidth, gameObj.fieldHeight, canvas.width, canvas.height
        );

        if (distanceObj.distanceX <= (canvas.width / 2) && distanceObj.distanceY <= (canvas.height / 2)) {

            const degreeDiff = calcDegreeDiffFromRadar(deg, distanceObj.degree);
            const toumeido = calcOpacity(degreeDiff);

            ctx.fillStyle = `rgba(255, 165, 0, ${toumeido})`;
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

            const degreeDiff = calcDegreeDiffFromRadar(deg, distanceObj.degree);
            const toumeido = calcOpacity(degreeDiff);

            ctx.fillStyle = `rgb(0, 220, 255, ${toumeido})`;
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

    const degree = calcTwoPointsDegree(drawX, drawY, canvasWidth / 2, canvasHeight / 2);


    return {
        distanceX,
        distanceY,
        drawX,
        drawY,
        degree
    };
}

function calcTwoPointsDegree(x1, y1, x2, y2) {
   const radian = Math.atan2(y2 - y1,x2 - x1);
   const degree = radian * 180 / Math.PI + 180;
   return degree;
}


/*
function calcDegreeDiffFromRadar(degRader, degItem) {
   degRader -= 15;
   let diff;
   let tmpDiff;
   if (degRader >= degItem) {
      diff = degRader - degItem;
      tmpDiff = degItem + 360 - degRader;
      if (diff > tmpDiff) {
         diff = tmpDiff;
      }
   } else {
      diff = degItem - degRader;
      tmpDiff = degRader + 360 - degItem;
      if (diff > tmpDiff) {
         diff = tmpDiff;
      }
   }

   return diff;
}
*/
function calcDegreeDiffFromRadar(degRader, degItem) {
   let diff = degRader - degItem;
   if (diff < 0) {
      diff += 360;
   }

   return diff;
}


function calcOpacity(degreeDiff) {
    degreeDiff = degreeDiff > 330 ? 360 : degreeDiff; // もう少しだけ暗くするコツ
   return (1 - 1 * degreeDiff / 360).toFixed(2);
   //return (1 - 1 * degreeDiff / 180).toFixed(2);
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

        if (gameObj.myDisplayName) {
           const rectWidth = gameObj.submarineImage.width - 28;

           if (gameObj.myThumbUrl === 'anonymous') { // anonymous

           } else if (gameObj.myThumbUrl === 'CPU') { // CPU

           } else if (gameObj.myThumbUrl) {

              /*
              ctx.drawImage(
                 gameObj.twitterImage,
                 canvas.width / 2  - (rectWidth / 2) + 1,
                 canvas.height / 2 - (rectWidth / 2) + 3,
                 rectWidth, rectWidth
              );
              */

           }

        }

    } else {

        drawBom(canvas.width / 2, canvas.height / 2, myPlayerObj.deadCount);

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
      drawX - gameObj.bomCellPx / 2, drawY - gameObj.bomCellPx / 2,
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

function drawRanking(ctx2, playerAndAiMap) {
   const playerAndAiArray = [].concat(Array.from(playerAndAiMap));
   playerAndAiArray.sort(function(a, b) {
      return b[1].score - a[1].score;
   });

   ctx2.fillStyle = "rgb(0, 0, 0)";
   ctx2.fillRect(0, 220, canvas2.width, 3);

   ctx2.fillStyle = "rgb(26, 26, 26)";
   ctx2.font = '20px Arial';

   for (let i = 0; i < 10; i++) {
       if (!playerAndAiArray[i]) return;

      const rank = i + 1;
      ctx2.fillText(
          `${rank}th ${playerAndAiArray[i][1].displayName} ${playerAndAiArray[i][1].score}`,
          10, 220 + (rank * 26)
       );
   }
}


socket.on('start data', (startObj) => {
    gameObj.myPlayerObj  = startObj.playerObj;
    gameObj.fieldWidth   = startObj.fieldWidth;
    gameObj.fieldHeight  = startObj.fieldHeight;
    socket.emit('user data', {displayName: gameObj.myDisplayName, thumbUrl: gameObj.myThumbUrl});
});

socket.on('map data', (mapData) => {
    gameObj.playersMap = new Map(mapData.playersMap);
    gameObj.AIMap = new Map(mapData.AIMap);
    gameObj.itemsMap = new Map(mapData.itemsMap);
    gameObj.airMap = new Map(mapData.airMap);
    gameObj.flyingMissilesMap = mapData.flyingMissilesMap;
    if (gameObj.playersMap.has(gameObj.myPlayerObj.socketId)) {
       gameObj.myPlayerObj = gameObj.playersMap.get(gameObj.myPlayerObj.socketId); // 自分の情報も更新
    }

    //drawMap(ctx, gameObj.playersMap, gameObj.itemsMap, gameObj.airMap, gameObj.myPlayerObj);
    //drawSubmarine(ctx, gameObj.myPlayerObj.direction);
    //drawMissiles(gameObj.myPlayerObj.missilesMany);
});

socket.on('disconnect', () => {
   socket.disconnect();
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

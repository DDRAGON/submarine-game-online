'use strict';
import io from 'socket.io-client';
import $ from 'jquery';
import zlib from 'zlib';

const socket = io($('#main').attr('data-ipAddress'));
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
    AIMap: new Map(),
    flyingMissilesMap: new Map(),
    itemRadius: 4,
    airRadius: 5,
    missileTimeFlame: 5,
    addAirTime: 30,
    fieldWidth: null,
    fieldHeight: null,
    bomCellPx: 32,
    myDisplayName: $('#main').attr('data-displayName'),
    myThumbUrl: $('#main').attr('data-thumbUrl'),
    socketKITENAIFlames: 0,
    counter: 0
};

init();

function init() {
    // 潜水艦の画像
    const submarineImage = new Image();
    submarineImage.src = '/images/submarineW.png';
    gameObj.submarineImage = submarineImage;

    // ミサイルの画像
    gameObj.missileImage = new Image();
    gameObj.missileImage.src = '/images/missile.png';

    // 爆発の画像集
    gameObj.bomListImage = new Image();
    gameObj.bomListImage.src = '/images/bomlist.png';

    // Wi-Fi 繋がってないよアイコン
    gameObj.wifiXImage = new Image();
    gameObj.wifiXImage.src = '/images/wifix.png';

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

    if (gameObj.playersMap.has(gameObj.myPlayerObj.socketId)) {
        gameObj.playersMap.set(gameObj.myPlayerObj.socketId, gameObj.myPlayerObj);
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
    if (gameObj.myPlayerObj.isAlive === false && gameObj.myPlayerObj.deadCount > 20) {
        drawGameOver();
    }
    moveInClient(gameObj.myPlayerObj, gameObj.itemsMap, gameObj.airMap, gameObj.myPlayerObj, gameObj.flyingMissilesMap);
    gameObj.missileTimeFlame -= 1;
    gameObj.socketKITENAIFlames += 1;
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
    ctx.strokeStyle = "rgb(0, 0, 0)";
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
    ctx.rotate(deg * Math.PI / 180);
    ctx.translate(-x, -y);

    /* グラデーション領域をセット */
    const grad = ctx.createLinearGradient(x, y, x + x / 3, y / 3);
    /* グラデーション終点のオフセットと色をセット */
    grad.addColorStop(0, 'rgba(0, 220, 0, 0)');
    grad.addColorStop(0.1, 'rgba(0, 220, 0, 0)');
    //grad.addColorStop(0.9,'rgba(0, 200, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 220, 0, 0.5)');
    /* グラデーションをfillStyleプロパティにセット */
    ctx.fillStyle = grad;

    ctx.arc(x, y, r, getRadian(0), getRadian(-30), true);
    ctx.lineTo(x, y);

    ctx.fill();

    ctx.restore(); // 元の設定を取得
    deg = (deg + 5) % 360;
}

const rotationDegreeByFlyingMissileDirection = {
    'left': 270,
    'up': 0,
    'down': 180,
    'right': 90
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

                const drawRadius = gameObj.counter % 12 + 2 + 12;
                const clearRadius = drawRadius - 2;
                const drawRadius2 = gameObj.counter % 12 + 2;
                const clearRadius2 = drawRadius2 - 2;

                ctx.fillStyle = `rgba(0, 0, 255, ${toumeido})`;
                ctx.beginPath();
                ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius, 0, Math.PI * 2, true);
                ctx.fill();

                ctx.fillStyle = `rgb(0, 20, 50)`;
                ctx.beginPath();
                ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius, 0, Math.PI * 2, true);
                ctx.fill();

                ctx.fillStyle = `rgba(0, 0, 255, ${toumeido})`;
                ctx.beginPath();
                ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius2, 0, Math.PI * 2, true);
                ctx.fill();

                ctx.fillStyle = `rgb(0, 20, 50)`;
                ctx.beginPath();
                ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius2, 0, Math.PI * 2, true);
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
                    gameObj.missileImage, -gameObj.missileImage.width / 2, -gameObj.missileImage.height / 2
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

                const drawRadius1 = gameObj.counter % 8 + 2 + 20;
                const clearRadius1 = drawRadius1 - 2;
                const drawRadius2 = gameObj.counter % 8 + 2 + 10;
                const clearRadius2 = drawRadius2 - 2;
                const drawRadius3 = gameObj.counter % 8 + 2 + 0;
                const clearRadius3 = drawRadius3 - 2;

                ctx.fillStyle = `rgba(255, 0, 0, ${toumeido})`;
                ctx.beginPath();
                ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius1, 0, Math.PI * 2, true);
                ctx.fill();

                ctx.fillStyle = "rgb(0, 20, 50)";
                ctx.beginPath();
                ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius1, 0, Math.PI * 2, true);
                ctx.fill();

                ctx.fillStyle = `rgba(255, 0, 0, ${toumeido})`;
                ctx.beginPath();
                ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius2, 0, Math.PI * 2, true);
                ctx.fill();

                ctx.fillStyle = "rgb(0, 20, 50)";
                ctx.beginPath();
                ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius2, 0, Math.PI * 2, true);
                ctx.fill();

                ctx.fillStyle = `rgba(255, 0, 0, ${toumeido})`;
                ctx.beginPath();
                ctx.arc(distanceObj.drawX, distanceObj.drawY, drawRadius3, 0, Math.PI * 2, true);
                ctx.fill();

                ctx.fillStyle = "rgb(0, 20, 50)";
                ctx.beginPath();
                ctx.arc(distanceObj.drawX, distanceObj.drawY, clearRadius3, 0, Math.PI * 2, true);
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
            ctx.arc(distanceObj.drawX, distanceObj.drawY, gameObj.itemRadius, 0, Math.PI * 2, true);
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
            ctx.arc(distanceObj.drawX, distanceObj.drawY, gameObj.airRadius, 0, Math.PI * 2, true);
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
    const radian = Math.atan2(y2 - y1, x2 - x1);
    const degree = radian * 180 / Math.PI + 180;
    return degree;
}


function calcDegreeDiffFromRadar(degRader, degItem) {
    let diff = degRader - degItem;
    if (diff < 0) {
        diff += 360;
    }

    return diff;
}


function calcOpacity(degreeDiff) {
    const deleteDeg = 270;
    degreeDiff = degreeDiff > deleteDeg ? deleteDeg : degreeDiff; // もう少しだけ暗くするコツ
    return (1 - degreeDiff / deleteDeg).toFixed(2);
    //return (1 - 1 * degreeDiff / 180).toFixed(2);
}

const rotationDegreeByDirection = {
    'left': 0,
    'up': 270,
    'down': 90,
    'right': 0
};

function drawSubmarine(ctx, myPlayerObj) {
    if (myPlayerObj.isAlive === true) {


        const rotationDegree = rotationDegreeByDirection[myPlayerObj.direction];

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(getRadian(rotationDegree));
        if (myPlayerObj.direction === 'left') {
            ctx.scale(-1, 1);
        }
        ctx.drawImage(
            gameObj.submarineImage, -(gameObj.submarineImage.width / 2), -(gameObj.submarineImage.height / 2)
        );
        ctx.restore();

        if (gameObj.socketKITENAIFlames > 12) {
            if (gameObj.socketKITENAIFlames % 10 !== 0) { // 点滅処理
                ctx.drawImage(
                    gameObj.wifiXImage,
                    canvas.width / 2 - (gameObj.wifiXImage.width / 2),
                    canvas.height / 2 - (gameObj.wifiXImage.height / 2)
                );
            }
        }

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
        cropX, cropY,
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

function moveInClient(playerObj, itemsMap, airMap, myPlayerObj, flyingMissilesMap) {

    if (playerObj.isAlive === false) {
        if (playerObj.deadCount < 60) {
            playerObj.deadCount += 1;
        }
        return;
    }

    // アイテムの取得チェック
    // アイテムのミサイル（赤丸）
    /*
    for (let [itemKey, itemObj] of itemsMap) {

        const distanceObj = calculationBetweenTwoPoints(
            playerObj.x, playerObj.y, itemObj.x, itemObj.y, gameObj.fieldWidth, gameObj.fieldHeight
        );

        if (
            distanceObj.distanceX <= (gameObj.submarineImage.width/2 + gameObj.itemRadius) &&
            distanceObj.distanceY <= (gameObj.submarineImage.width/2 + gameObj.itemRadius)
        ) { // got item!

            gameObj.itemsMap.delete(itemKey);
            playerObj.missilesMany = playerObj.missilesMany > 5 ? 6 : playerObj.missilesMany + 1;
            playerObj.score += gameObj.itemPoint;
        }
    }

    // アイテムの空気（青丸）
    for (let [airKey, airObj] of airMap) {

        const distanceObj = calculationBetweenTwoPoints(
            playerObj.x, playerObj.y, airObj.x, airObj.y, gameObj.fieldWidth, gameObj.fieldHeight
        );

        if (
            distanceObj.distanceX <= (gameObj.submarineImage.width/2 + gameObj.airRadius) &&
            distanceObj.distanceY <= (gameObj.submarineImage.width/2 + gameObj.airRadius)
        ) { // got air!

            gameObj.airMap.delete(airKey);
            if (playerObj.airTime + gameObj.addAirTime > 99) {
                playerObj.airTime = 99;
            } else {
                playerObj.airTime += gameObj.addAirTime;
            }
            playerObj.score += gameObj.itemPoint;
        }
    }
    */

    /*
        // 撃ち放たれているミサイルの当たり判定
    for (let [missileId, flyingMissile] of flyingMissilesMap) {

        const distanceObj = calculationBetweenTwoPoints(
            playerObj.x, playerObj.y, flyingMissile.x, flyingMissile.y, gameObj.fieldWidth, gameObj.fieldHeight
        );

        if (
            distanceObj.distanceX <= (gameObj.submarineImage.width/2 + gameObj.missileWidth/2) &&
            distanceObj.distanceY <= (gameObj.submarineImage.width/2 + gameObj.missileHeight/2) &&
            playerObj.socketId !== flyingMissile.emitPlayerId
        ) {
            playerObj.isAlive = false;
            gameObj.flyingMissilesMap.delete(missileId);

            // 得点の更新
            if (gameObj.playersMap.has(flyingMissile.emitPlayerId)) {
                const emitPlayer = gameObj.playersMap.get(flyingMissile.emitPlayerId);
                emitPlayer.score += gameObj.killPoint;
                gameObj.playersMap.set(flyingMissile.emitPlayerId, emitPlayer);
            } else if (gameObj.AIMap.has(flyingMissile.emitPlayerId)) {
                const emitAI = gameObj.AIMap.get(flyingMissile.emitPlayerId);
                emitAI.score += gameObj.killPoint;
                gameObj.AIMap.set(flyingMissile.emitPlayerId, emitAI);
            }
        }
    }
    */

    // 移動
    switch (playerObj.direction) {
        case 'left':
            playerObj.x -= 1;
            break;
        case 'up':
            playerObj.y -= 1;
            break;
        case 'down':
            playerObj.y += 1;
            break;
        case 'right':
            playerObj.x += 1;
            break;
    }
    if (playerObj.x > gameObj.fieldWidth) playerObj.x -= gameObj.fieldWidth;
    if (playerObj.x < 0) playerObj.x += gameObj.fieldWidth;
    if (playerObj.y < 0) playerObj.y += gameObj.fieldHeight;
    if (playerObj.y > gameObj.fieldHeight) playerObj.y -= gameObj.fieldHeight;

    playerObj.aliveTime.clock += 1;
    if (playerObj.aliveTime.clock === 30) {
        playerObj.aliveTime.clock = 0;
        playerObj.aliveTime.seconds += 1;
        //decreaseAir(playerObj);
        //playerObj.score += 1;
    }

    // 飛んでいるミサイルの移動
    for (let [missileId, flyingMissile] of flyingMissilesMap) {
        if (flyingMissile.aliveFlame === 0) {
            gameObj.flyingMissilesMap.delete(missileId);
            continue;
        }

        flyingMissile.aliveFlame -= 1;

        switch (flyingMissile.direction) {
            case 'left':
                flyingMissile.x -= gameObj.missileSpeed;
                break;
            case 'up':
                flyingMissile.y -= gameObj.missileSpeed;
                break;
            case 'down':
                flyingMissile.y += gameObj.missileSpeed;
                break;
            case 'right':
                flyingMissile.x += gameObj.missileSpeed;
                break;
        }
        if (flyingMissile.x > gameObj.fieldWidth) flyingMissile.x -= gameObj.fieldWidth;
        if (flyingMissile.x < 0) flyingMissile.x += gameObj.fieldWidth;
        if (flyingMissile.y < 0) flyingMissile.y += gameObj.fieldHeight;
        if (flyingMissile.y > gameObj.fieldHeight) flyingMissile.y -= gameObj.fieldHeight;
    }
}

function decreaseAir(playerObj) {
    playerObj.airTime -= 1;
    if (playerObj.airTime === 0) {
        playerObj.isAlive = false;
        return;
    }
}


socket.on('start data', (startObj) => {
    gameObj.fieldWidth = startObj.fieldWidth;
    gameObj.fieldHeight = startObj.fieldHeight;
    gameObj.itemPoint = startObj.itemPoint;
    gameObj.addAirTime = startObj.addAirTime;
    gameObj.missileWidth = startObj.missileWidth;
    gameObj.missileHeight = startObj.missileHeight;
    gameObj.missileSpeed = startObj.missileSpeed;
    gameObj.counterMax = startObj.counterMax;
    gameObj.counter = startObj.counter;
    gameObj.myPlayerObj = startObj.playerObj;
    socket.emit('user data', { displayName: gameObj.myDisplayName, thumbUrl: gameObj.myThumbUrl });
});

socket.on('map data', (compressed) => {

    const playersArray = compressed[0];
    const aiArray = compressed[1];
    const itemsArray = compressed[2];
    const airArray = compressed[3];
    const flyingMissilesArray = compressed[4];

    gameObj.playersMap = new Map();
    for (let compressedPlayerData of playersArray) {
        const socketId = compressedPlayerData[9];

        const player = {};
        player.x = compressedPlayerData[0];
        player.y = compressedPlayerData[1];
        player.displayName = compressedPlayerData[2];
        player.score = compressedPlayerData[3];
        player.isAlive = compressedPlayerData[4];
        player.deadCount = compressedPlayerData[5];
        player.direction = compressedPlayerData[6];
        player.missilesMany = compressedPlayerData[7];
        player.airTime = compressedPlayerData[8];

        gameObj.playersMap.set(socketId, player);

        // 自分の情報も更新
        if (socketId === gameObj.myPlayerObj.socketId) {
            gameObj.myPlayerObj.x = compressedPlayerData[0];
            gameObj.myPlayerObj.y = compressedPlayerData[1];
            gameObj.myPlayerObj.displayName = compressedPlayerData[2];
            gameObj.myPlayerObj.score = compressedPlayerData[3];
            gameObj.myPlayerObj.isAlive = compressedPlayerData[4];
            gameObj.myPlayerObj.deadCount = compressedPlayerData[5];
            //gameObj.myPlayerObj.direction = compressedPlayerData[6];
            gameObj.myPlayerObj.missilesMany = compressedPlayerData[7];
            gameObj.myPlayerObj.airTime = compressedPlayerData[8];
        }
    }

    gameObj.AIMap = new Map();
    for (let compressedAiData of aiArray) {
        const id = compressedAiData[6];

        const ai = {};
        ai.x = compressedAiData[0];
        ai.y = compressedAiData[1];
        ai.displayName = compressedAiData[2];
        ai.score = compressedAiData[3];
        ai.isAlive = compressedAiData[4];
        ai.deadCount = compressedAiData[5];

        gameObj.AIMap.set(id, ai);
    }

    gameObj.itemsMap = new Map();
    let counter = 1;
    for (let compressedItemData of itemsArray) {
        gameObj.itemsMap.set(counter, { x: compressedItemData[0], y: compressedItemData[1] });
        counter++;
    }

    gameObj.airMap = new Map();
    counter = 1;
    for (let compressedAirData of airArray) {
        gameObj.airMap.set(counter, { x: compressedAirData[0], y: compressedAirData[1] });
        counter++;
    }

    gameObj.flyingMissilesMap = new Map();
    counter = 1;
    for (let compressedflyingMissileData of flyingMissilesArray) {
        gameObj.flyingMissilesMap.set(counter, {
            x: compressedflyingMissileData[0],
            y: compressedflyingMissileData[1],
            direction: compressedflyingMissileData[2],
            emitPlayerId: compressedflyingMissileData[3]
        });
        counter++;
    }

    /*
    restore(compressed).then((mapData) => {
        if (checkCounterDiff(gameObj.counter, mapData.counter, gameObj.counterMax)) { return; } // 古すぎる
        gameObj.playersMap = new Map(mapData.playersMap);
        gameObj.AIMap = new Map(mapData.AIMap);
        gameObj.itemsMap = new Map(mapData.itemsMap);
        gameObj.airMap = new Map(mapData.airMap);
        gameObj.flyingMissilesMap = new Map(mapData.flyingMissilesMap);
        gameObj.counter = mapData.counter;
        if (gameObj.playersMap.has(gameObj.myPlayerObj.socketId)) {
            gameObj.myPlayerObj = gameObj.playersMap.get(gameObj.myPlayerObj.socketId); // 自分の情報も更新
        }
    });
    */
    gameObj.socketKITENAIFlames = 0;
});

socket.on('disconnect', () => {
    socket.disconnect();
});


function checkCounterDiff(clientCounter, serverCounter, counterMax) {
    let diff = 9999999;

    if (clientCounter >= serverCounter) {
        diff = clientCounter - serverCounter;
    } else {
        diff = clientCounter + counterMax - serverCounter;
    }
    //return diff > 5;
    return false;
}



$(window).keydown(function(event) {
    if (!gameObj.myPlayerObj || gameObj.myPlayerObj.isAlive === false) return;

    switch (event.key) {
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
            gameObj.myPlayerObj.missilesMany -= 1;
            const missileId = Math.floor(Math.random() * 100000) + ',' + gameObj.myPlayerObj.socketId + ',' + gameObj.myPlayerObj.x + ',' + gameObj.myPlayerObj.y;

            const missileObj = {
                emitPlayerId: gameObj.myPlayerObj.socketId,
                x: gameObj.myPlayerObj.x,
                y: gameObj.myPlayerObj.y,
                aliveFlame: gameObj.missileAliveFlame,
                direction: gameObj.myPlayerObj.direction,
                id: missileId
            };
            gameObj.flyingMissilesMap.set(missileId, missileObj);
            sendMissileEmit(socket, gameObj.myPlayerObj.direction);
            break;
    }
});

function restore(compressed) {
    return new Promise((resolve, reject) => {
        const buffer = Buffer.from(compressed, 'base64');
        zlib.unzip(buffer, (err, buffer) => {
            if (!err) {
                //resolve(buffer);
                resolve(JSON.parse(buffer.toString()));
            } else {
                console.log(err);
                reject(err);
            }
        });
    });
}


function getRadian(kakudo) {
    return kakudo * Math.PI / 180
}
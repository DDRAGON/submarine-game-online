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
canvas2.height = 200;
const ctx2 = canvas2.getContext('2d');

const gameObj = {
    playersMap: new Map(),
    itemsMap: new Map(),
    itemRadius: 4
};

init();
function init() {
    const submarineImage = new Image();
    submarineImage.src = '/images/submarine2.png';
    gameObj.submarineImage = submarineImage;
    const missileImage = new Image();
    missileImage.src = '/images/missile.png';
    gameObj.missileImage = missileImage;
}

let deg = 0;
let counter = 0;

function ticker() {
    if (!gameObj.myPlayerObj) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height); // まっさら
    drawRadar();
    move();
    drawMap(ctx, gameObj.playersMap, gameObj.itemsMap);
    drawSubmarine(ctx, gameObj.myPlayerObj.direction);
    sendPosition(counter, gameObj.myPlayerObj, socket);
    getItem(ctx, gameObj.myPlayerObj, gameObj.itemsMap);
    counter = (counter + 1) % 10000;
}
setInterval(ticker, 30);

const x = canvas.width / 2;
const y = canvas.height / 2;
const r = canvas.width / 2;
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

    ctx.arc(x, y, r, getRadian(0), getRadian(-45), true);
    ctx.lineTo(x, y);

    ctx.fill();

    ctx.restore(); // 元の設定を取得
    deg += 3;
}

function drawMap(ctx, playersMap, itemsMap) {
    // アイテムの描画
    ctx.fillStyle = "rgb(255, 0, 0)";
    for (const item of itemsMap.values()) {
        if (
            Math.abs(gameObj.myPlayerObj.x - item.x) <= (canvas.width / 2) &&
            Math.abs(gameObj.myPlayerObj.y - item.y) <= (canvas.height / 2)
        ) {
            const itemDrawX = item.x - gameObj.myPlayerObj.x + canvas.width / 2;
            const itemDrawY = item.y - gameObj.myPlayerObj.y + canvas.height / 2;
            ctx.beginPath();
            ctx.arc(itemDrawX, itemDrawY, gameObj.itemRadius, 0, Math.PI*2, true);
            ctx.fill();

            getItem(ctx, gameObj.myPlayerObj, item); // アイテム取得判定
        }
    }
}

function move() {
    switch(gameObj.myPlayerObj.direction) {
        case 'left':
            gameObj.myPlayerObj.x -= 1;
            break;
        case 'up':
            gameObj.myPlayerObj.y -= 1;
            break;
        case 'down':
            gameObj.myPlayerObj.y += 1;
            break;
        case 'right':
            gameObj.myPlayerObj.x += 1;
            break;
    }
    if (gameObj.myPlayerObj.x > 10000) gameObj.myPlayerObj.x -= 10000;
    if (gameObj.myPlayerObj.x < 0) gameObj.myPlayerObj.x += 10000;
    if (gameObj.myPlayerObj.y < 0) gameObj.myPlayerObj.y += 10000;
    if (gameObj.myPlayerObj.y > 10000) gameObj.myPlayerObj.y -= 10000;
}

const rotationDegreeByDirection = {
    'left': 0, 'up': 270, 'down': 90, 'right': 0
};
function drawSubmarine(ctx, direction){
    const rotationDegree = rotationDegreeByDirection[direction];

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(getRadian(rotationDegree));
    if (direction === 'left') {
        ctx.scale(-1, 1);
    }
    ctx.drawImage(
        gameObj.submarineImage,
        -(gameObj.submarineImage.width/2),
        -(gameObj.submarineImage.height/2)
    );
    ctx.restore();
}

function sendPosition(counter, myPlayerObj, socket) {
    if (counter % 10 === 0) {
        socket.emit('player position', myPlayerObj);
    }
}

function getItem(ctx, myPlayerObj, item) {
    if (
        Math.abs(myPlayerObj.x - item.x) <= (gameObj.submarineImage.width/2 + gameObj.itemRadius) &&
        Math.abs(myPlayerObj.y - item.y) <= (gameObj.submarineImage.width/2 + gameObj.itemRadius)
    ) { // itemGot
        const itemKey = `${item.x},${item.y}`;
        gameObj.itemsMap.delete(itemKey);
        socket.emit('got item', itemKey);
        gameObj.myPlayerObj.missilesMany = gameObj.myPlayerObj.missilesMany > 5 ? 6 : gameObj.myPlayerObj.missilesMany + 1;
        drawMissiles(gameObj.myPlayerObj.missilesMany);
    }
}

function drawMissiles(missilesMany) {
    ctx2.clearRect(0, 0, canvas2.width, canvas2.height); // まっさら
    for (let i = 0; i < missilesMany; i++) {
        ctx2.drawImage(gameObj.missileImage, 50 * i, 80);
    }
}

socket.on('start data', (myPlayerObj) => {
    myPlayerObj.direction = 'right';
    gameObj.myPlayerObj = myPlayerObj;
});

socket.on('map data', (mapData) => {
    gameObj.playersMap = new Map(mapData.playersMap);
    gameObj.itemsMap = new Map(mapData.itemsMap);
});

socket.on('players data', (playersMap) => {
    gameObj.playersMap = playersMap;
});


$(window).keydown(function(event){
    if (!gameObj.myPlayerObj) return;

    switch(event.key) {
        case 'ArrowLeft':
            if (gameObj.myPlayerObj.direction === 'left') break; // 変わってない
            gameObj.myPlayerObj.direction = 'left';
            drawSubmarine(ctx, 'left');
            break;
        case 'ArrowUp' :
            if (gameObj.myPlayerObj.direction === 'up') break; // 変わってない
            gameObj.myPlayerObj.direction = 'up';
            drawSubmarine(ctx, 'up');
            break;
        case 'ArrowDown' :
            if (gameObj.myPlayerObj.direction === 'down') break; // 変わってない
            gameObj.myPlayerObj.direction = 'down';
            drawSubmarine(ctx, 'down');
            break;
        case 'ArrowRight' :
            if (gameObj.myPlayerObj.direction === 'right') break; // 変わってない
            gameObj.myPlayerObj.direction = 'right';
            drawSubmarine(ctx, 'right');
            break;
    }
});


function getRadian(kakudo) {
    return kakudo * Math.PI / 180
}

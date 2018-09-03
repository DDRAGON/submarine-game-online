const gameObj = {
    playersMap: new Map(),
    itemsMap: new Map(),
    airMap: new Map(),
    flyingMissiles: [],
    missileAliveFlame: 180,
    missileSpeed: 3
};
const fieldWidth = 10000;
const fieldHeight = 10000;

init(); // 初期化（初期化はサーバー起動時に行う）

function init() {
    for (let i = 0; i < 400; i++) {
        addItem();
    }
    for (let a = 0; a < 600; a++) {
        addAir();
    }
}

const gameTicker = setInterval(() => {
    movePlayer(gameObj.playersMap); // 潜水艦の移動
    checkGetItem(gameObj.playersMap, gameObj.itemsMap, gameObj.airMap);
    moveMissile(gameObj.flyingMissiles); // ミサイルの移動
}, 33);

function movePlayer(playersMap) { // 潜水艦の移動
    for (let [key, value] of playersMap) {
        switch (value.direction) {
            case 'left':
                value.x -= 1;
                break;
            case 'up':
                value.y -= 1;
                break;
            case 'down':
                value.y += 1;
                break;
            case 'right':
                value.x += 1;
                break;
        }
        if (value.x > 10000) value.x -= 10000;
        if (value.x < 0) value.x += 10000;
        if (value.y < 0) value.y += 10000;
        if (value.y > 10000) value.y -= 10000;

        value.aliveTime.clock += 1;
        if (value.aliveTime.clock === 30) {
            value.aliveTime.clock = 0;
            value.aliveTime.seconds += 1;
            decleaseAir(value);
        }
    }
}

function moveMissile(flyingMissiles) { // ミサイルの移動
    for (let i = 0; i <  flyingMissiles.length; i++) {
        const missile = flyingMissiles[i];

        if (missile.aliveFlame === 0) {
            flyingMissiles.splice(i, 0);
            i--;
            continue;
        }

        missile.aliveFlame -= 1;

        switch (missile.direction) {
            case 'left':
                missile.x -= gameObj.missileSpeed;
                break;
            case 'up':
                missile.y -= gameObj.missileSpeed;
                break;
            case 'down':
                missile.y += gameObj.missileSpeed;
                break;
            case 'right':
                missile.x += gameObj.missileSpeed;
                break;
        }
    }
}

function decleaseAir(playerObj) {
    playerObj.airTime -= 1;
    if (playerObj.airTime < 0) {
        playerObj.isAlive = false;
    }
}

const submarineImageWidth = 42;
const itemRadius = 4;
const airRadius = 6;
const addAirTime = 30;
function checkGetItem(playersMap, itemsMap, airMap) {
    for (let [socketId, playerObj] of playersMap) {

        for (let [itemKey, itemObj] of itemsMap) {
            if (
                Math.abs(playerObj.x - itemObj.x) <= (submarineImageWidth/2 + itemRadius) &&
                Math.abs(playerObj.y - itemObj.y) <= (submarineImageWidth/2 + itemRadius)
            ) { // got item!

                gameObj.itemsMap.delete(itemKey);
                playerObj.missilesMany = playerObj.missilesMany > 5 ? 6 : playerObj.missilesMany + 1;
                addItem();
            }
        }

        for (let [airKey, airObj] of airMap) {
            if (
                Math.abs(playerObj.x - airObj.x) <= (submarineImageWidth/2 + airRadius) &&
                Math.abs(playerObj.y - airObj.y) <= (submarineImageWidth/2 + airRadius)
            ) { // got air!

                gameObj.airMap.delete(airKey);
                if (playerObj.airTime + addAirTime > 99) {
                    playerObj.airTime = 99;
                } else {
                    playerObj.airTime += addAirTime;
                }
                addAir();
            }
        }
    }
}




function getPlayers() {
    return Array.from(gameObj.playersMap);
}

function getItems() {
    return Array.from(gameObj.itemsMap);
}

function getMapData() {
    return {
        playersMap: Array.from(gameObj.playersMap),
        itemsMap: Array.from(gameObj.itemsMap),
        airMap: Array.from(gameObj.airMap)
    };
}

function newConnection(socketId) {
    const playerX = Math.floor(Math.random() * fieldWidth);
    const playerY = Math.floor(Math.random() * fieldHeight);
    const playerObj = {
        x: playerX,
        y: playerY,
        isAlive: true,
        direction: 'right',
        missilesMany: 0,
        missileTimeFlame: 3,
        airTime: 99,
        aliveTime: {'clock': 0, 'seconds': 0},
        socketId: socketId
    };
    gameObj.playersMap.set(socketId, playerObj);
    return playerObj;
}

function updatePlayerDirection(socketId, direction) {
    const playerObj = gameObj.playersMap.get(socketId);
    playerObj.direction = direction;
    gameObj.playersMap.set(socketId, playerObj);
}

function missileEmit(socketId, direction) {
    const playerObj = gameObj.playersMap.get(socketId);
    if (playerObj.missilesMany <= 0) return; // 撃てないやん

    playerObj.missilesMany -= 1;

    const missileObj = {
        emitPlayerId: socketId,
        x: playerObj.x,
        y: playerObj.y,
        aliveFlame: gameObj.missileAliveFlame,
        direction: direction
    };
    gameObj.flyingMissiles.push(missileObj);
}

function gotItem(socketId, itemKey) {
    gameObj.itemsMap.delete(itemKey); // アイテム消去
    addItem();
    const playerObj = gameObj.playersMap.get(socketId);
    playerObj.missilesMany = playerObj.missilesMany > 5 ? 6 : playerObj.missilesMany + 1;
    gameObj.playersMap.set(socketId, playerObj);
    return getMapData();
}

function addItem() {
    const itemX = Math.floor(Math.random() * fieldWidth);
    const itemY = Math.floor(Math.random() * fieldHeight);
    const itemKey = `${itemX},${itemY}`;

    if (gameObj.itemsMap.has(itemKey)) { // アイテムの位置が被ってしまった場合は
        return addItem(); // 場所が重複した場合は作り直し
    }

    const itemObj = {
        x: itemX,
        y: itemY,
        isAlive: true
    };
    gameObj.itemsMap.set(itemKey, itemObj);
}

function addAir() {
    const airX = Math.floor(Math.random() * fieldWidth);
    const airY = Math.floor(Math.random() * fieldHeight);
    const airKey = `${airX},${airY}`;

    if (gameObj.airMap.has(airKey)) { // アイテムの位置が被ってしまった場合は
        return addAir(); // 場所が重複した場合は作り直し
    }

    const airObj = {
        x: airX,
        y: airY,
        isAlive: true
    };
    gameObj.airMap.set(airKey, airObj);
}


module.exports = {
    newConnection,
    getItems,
    getPlayers,
    getMapData,
    updatePlayerPosition,
    updatePlayerDirection,
    gotItem,
    missileEmit
};
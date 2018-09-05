const gameObj = {
    playersMap: new Map(),
    itemsMap: new Map(),
    airMap: new Map(),
    flyingMissiles: [],
    missileAliveFlame: 180,
    missileSpeed: 3,
    missileWidth: 30,
    missileHeight: 30,
    fieldWidth: 10000,
    fieldHeight: 10000
};

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
    movePlayers(gameObj.playersMap); // 潜水艦の移動
    moveMissile(gameObj.flyingMissiles); // ミサイルの移動
    checkGetItem(gameObj.playersMap, gameObj.itemsMap, gameObj.airMap, gameObj.flyingMissiles);
}, 33);

function movePlayers(playersMap) { // 潜水艦の移動
    for (let [key, value] of playersMap) {

        if (value.isAlive === false) {
            if (value.deadCount < 20) {
                value.deadCount += 1;
            }
            continue;
        }

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
        if (value.x > gameObj.fieldWidth) value.x -= gameObj.fieldWidth;
        if (value.x < 0) value.x += gameObj.fieldWidth;
        if (value.y < 0) value.y += gameObj.fieldHeight;
        if (value.y > gameObj.fieldHeight) value.y -= gameObj.fieldHeight;

        value.aliveTime.clock += 1;
        if (value.aliveTime.clock === 30) {
            value.aliveTime.clock = 0;
            value.aliveTime.seconds += 1;
            decreaseAir(value);
        }
    }
}

function moveMissile(flyingMissiles) { // ミサイルの移動
    for (let i = flyingMissiles.length - 1; i >= 0  ; i--) {
        const missile = flyingMissiles[i];

        if (missile.aliveFlame === 0) {
            flyingMissiles.splice(i, 1);
            continue;
        }

        flyingMissiles[i].aliveFlame -= 1;

        switch (missile.direction) {
            case 'left':
                flyingMissiles[i].x -= gameObj.missileSpeed;
                break;
            case 'up':
                flyingMissiles[i].y -= gameObj.missileSpeed;
                break;
            case 'down':
                flyingMissiles[i].y += gameObj.missileSpeed;
                break;
            case 'right':
                flyingMissiles[i].x += gameObj.missileSpeed;
                break;
        }
    }
}

function decreaseAir(playerObj) {
    playerObj.airTime -= 1;
    if (playerObj.airTime === 0) {
        playerObj.isAlive = false;
        return;
    }
}

const submarineImageWidth = 42;
const itemRadius = 4;
const airRadius = 6;
const addAirTime = 30;
function checkGetItem(playersMap, itemsMap, airMap, flyingMissiles) {
    for (let [socketId, playerObj] of playersMap) {

        // アイテムのミサイル（赤丸）
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

        // アイテムの空気（青丸）
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

        // 撃ち放たれているミサイル
        for (let i = flyingMissiles.length - 1; i >= 0  ; i--) {
            const missile = flyingMissiles[i];

            if (
                Math.abs(playerObj.x - missile.x) <= (submarineImageWidth/2 + gameObj.missileWidth/2) &&
                Math.abs(playerObj.y - missile.y) <= (submarineImageWidth/2 + gameObj.missileHeight/2) &&
                playerObj.socketId !== missile.emitPlayerId
            ) {
                playerObj.isAlive = false;
                flyingMissiles.splice(i, 0);
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
        airMap: Array.from(gameObj.airMap),
        flyingMissiles: gameObj.flyingMissiles
    };
}

function newConnection(socketId) {
    const playerX = Math.floor(Math.random() * gameObj.fieldWidth);
    const playerY = Math.floor(Math.random() * gameObj.fieldHeight);
    const playerObj = {
        x: playerX,
        y: playerY,
        isAlive: true,
        deadCount: 0,
        direction: 'right',
        missilesMany: 0,
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

function disconnect(socketId) {
    gameObj.playersMap.delete(socketId);
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
    const itemX = Math.floor(Math.random() * gameObj.fieldWidth);
    const itemY = Math.floor(Math.random() * gameObj.fieldHeight);
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
    const airX = Math.floor(Math.random() * gameObj.fieldWidth);
    const airY = Math.floor(Math.random() * gameObj.fieldHeight);
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
    updatePlayerDirection,
    gotItem,
    missileEmit,
    disconnect
};
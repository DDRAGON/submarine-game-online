const gameObj = {
    playersMap: new Map(),
    itemsMap: new Map()
};
const fieldWidth = 10000;
const fieldHeight = 10000;

init(); // 初期化（初期化はサーバー起動時に行う）

function init() {
    for (let i = 0; i < 500; i++) {
        addItem();
    }
}

const gameTicker = setInterval(() => {
    move(gameObj.playersMap); // 潜水艦の移動
    checkGetItem(gameObj.playersMap, gameObj.itemsMap);
}, 33);

function move(playersMap) {
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
    }
}

const submarineImageWidth = 42;
const itemRadius = 4;
function checkGetItem(playersMap, itemsMap) {
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
        itemsMap: Array.from(gameObj.itemsMap)
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
        socketId: socketId
    };
    gameObj.playersMap.set(socketId, playerObj);
    return playerObj;
}

function updatePlayerPosition(socketId, gotPlayerObj) {
    const playerObj = gameObj.playersMap.get(socketId);
    playerObj.x = gotPlayerObj.x;
    playerObj.y = gotPlayerObj.y;
    gameObj.playersMap.set(socketId, playerObj);
}

function updatePlayerDirection(socketId, direction) {
    const playerObj = gameObj.playersMap.get(socketId);
    playerObj.direction = direction;
    gameObj.playersMap.set(socketId, playerObj);
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

    if (gameObj.itemsMap.get(itemKey)) { // アイテムの位置が被ってしまった場合は
        return addItem(); // 場所が重複した場合は作り直し
    }

    const itemObj = {
        x: itemX,
        y: itemY,
        isAlive: true
    };
    gameObj.itemsMap.set(itemKey, itemObj);
}


module.exports = {
    newConnection,
    getItems,
    getPlayers,
    getMapData,
    updatePlayerPosition,
    updatePlayerDirection,
    gotItem
};
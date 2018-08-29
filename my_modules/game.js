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
    gotItem
};
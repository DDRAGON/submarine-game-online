const gameObj = {
    playersMap: new Map(),
    items: []
};
init(); // 初期化

function init() {
    for (let i = 0; i < 100; i++) {
        const itemX = Math.floor(Math.random()* 10000);
        const itemY = Math.floor(Math.random()* 10000);
        const itemObj = {
            x: itemX,
            y: itemY,
            isAlive: true
        };
        gameObj.items.push(itemObj);
    }
}


function getPlayers() {
    return gameObj.items;
}

function getItems() {
    return gameObj.items;
}

function newConnection(socketId) {
    const playerX = Math.floor(Math.random()* 10000);
    const playerY = Math.floor(Math.random()* 10000);
    const playerObj = {
        x: playerX,
        y: playerY,
        isAlive: true,
        socketId: socketId
    };
    gameObj.playersMap.set(socketId, playerObj);
}

module.exports = {
    newConnection: newConnection,
    getItems: getItems
};
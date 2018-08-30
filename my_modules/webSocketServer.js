function createWebSocketServer(io, game) {

    const rootIo = io.of('/');
    rootIo.on('connection', function (socket) {
        const playerObj = game.newConnection(socket.id);

        socket.emit('start data', playerObj);


        socket.on('change direction', (direction) => {
            game.updatePlayerDirection(socket.id, direction);
        });
    });

    const socketTicker = setInterval(() => {
        rootIo.emit('map data', game.getMapData()); // 全員に送信
    }, 33);
}

module.exports = {
    createWebSocketServer
};
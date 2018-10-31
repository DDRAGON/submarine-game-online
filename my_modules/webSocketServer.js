function createWebSocketServer(io, game) {

    const rootIo = io.of('/');
    rootIo.on('connection', function(socket) {
        const startObj = game.newConnection(socket.id);

        socket.emit('start data', startObj);

        socket.on('user data', (userData) => {
            game.updateUserData(socket.id, userData.displayName, userData.thumbUrl);
        });

        socket.on('change direction', (direction) => {
            game.updatePlayerDirection(socket.id, direction);
        });

        socket.on('missile emit', (direction) => {
            game.missileEmit(socket.id, direction);
        });

        socket.on('disconnect', () => {
            game.disconnect(socket.id);
        });
    });

    const socketTicker = setInterval(() => {
            game.getMapData().then((result) => {
                //console.log(result);
                rootIo.emit('map data', result); // 全員に送信
            });
        },
        33);
}

module.exports = {
    createWebSocketServer
};
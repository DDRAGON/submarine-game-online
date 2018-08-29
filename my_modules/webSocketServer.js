function createWebSocketServer(io, game) {

    const rootIo = io.of('/');
    rootIo.on('connection', function (socket) {
        const playerObj = game.newConnection(socket.id);

        socket.emit('start data', playerObj);
        socket.emit('map data', game.getMapData());
        rootIo.emit('players data', game.getPlayers());

        socket.on('player position', (playerObj) => {
            game.updatePlayerPosition(socket.id, playerObj);
        });

        socket.on('got item', (itemKey) => {
            const newMapData = game.gotItem(socket.id, itemKey);
            socket.emit('map data', newMapData);
        });
    });

}

module.exports = {
    createWebSocketServer
};
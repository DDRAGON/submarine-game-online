function createWebSocketServer(io, game) {

    const rootIo = io.of('/');
    rootIo.on('connection', function (socket) {
        console.log('connection came!');
        game.newConnection(socket.id);

        socket.emit('map data', messages);


        socket.on('message was submitted', function (data) {
            console.log('message was submitted came!');

            const time = new Date().getTime();
            const newMessage = {
                time: time,
                message: data.message
            };
            messages.push(newMessage);

            rootIo.emit('new message', newMessage);
        });
    });

}




module.exports = {
    createWebSocketServer: createWebSocketServer
};
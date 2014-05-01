var Message = require('./models/Message');

module.exports = function (io) {

    io.sockets.on('connection', function (client) {

        var session = client.handshake.session;

        client.on('room', function (room) {
            if (client.room) socket.leave(client.room);

            client.room = room;
            client.join(room.current);

            client.in(room.current).emit('connected');
            client.in(room.current).broadcast.emit('new user', { msg: 'entrou', date: new Date(), user: session.user.email });
        });

        client.on('new message', function (message) {
            var newMessage = new Message({
                id: message.id,
                email: session.user.email,
                message: message.msg,
                date: new Date().toString()
            });

            newMessage.save();

            client.in(client.room.current).emit('sent', { id: message.id, date: new Date() });
            client.in(client.room.current).broadcast.emit('new message', { msg: message.msg, date: new Date(), user: session.user.email });
        });

        client.on('disconnect', function () {
            client.broadcast.emit('user left', { msg: 'saiu', date: new Date(), user: session.user.email });
        });

    });

};
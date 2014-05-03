define([
    'jquery',
    'underscore',
    'backbone',
    'socketio',
    'localforage',

    'views/chat/mailslot',

    'views/chat/message/FriendMessageView',
    'views/chat/message/MyMessageView',

    'text!templates/chat/chat.html',
    'jquery.format'
], function (
    $,
    _,
    Backbone,
    io,
    database,

    mailslot,

    FriendMessageView,
    MyMessageView,

    template
) {

    var ChatView = Backbone.View.extend({

        el: $('.chat'),

        options: ['socket'],

        events: {
            'click #send': 'send',
            'keypress #message': 'enter',
            'click .panel-primary > .panel-heading': 'toggle'
        },

        initialize: function (options) {
            this.setOptions(options);
        },

        render: function () {
            this.$el.html(template);

            var self = this;

            var socket = io.connect();

            mailslot.initialize(socket);

            socket.on('disconnect', function () {
                self.showStatus(false, 'desconectado');

                $(document).trigger('connected', [false]);
            });

            socket.on('connecting', function () {
                self.showStatus(false, 'aguarde, conectando...');
            });

            socket.on('connect_failed', function() {
                self.showStatus(false, 'falha ao conectar');
            });

            socket.on('reconnect', function() {
                self.showStatus(true, 'reconectado');
            });

            socket.on('reconnecting', function() {
                self.showStatus(false, 'aguarde, reconectando...');
            });

            socket.on('reconnect_failed', function () {
                self.showStatus(false, 'falha ao reconectar');
            });

            socket.on('connect', function () {
                var room = { current: '1' };
                socket.emit('room', room);

                socket.on('connected', function () {
                    self.showStatus(true, 'conectado');
                    console.log('conectado');
                    
                    $(document).trigger('connected', [true]);
                });

                socket.on('new user', function (message) {
                    var messageView = new FriendMessageView({ model: message });
                    self.showMessage(messageView);
                });

                socket.on('user left', function (message) {
                    var messageView = new FriendMessageView({ model: message });
                    self.showMessage(messageView);
                });

                socket.on('new message', function (message) {
                    var messageView = new FriendMessageView({ model: message });
                    self.showMessage(messageView);
                });

                socket.on('sent', function (message) {
                    database.ready(function () {
                        database.removeItem(message.key);
                        
                        var date = $.format.date(new Date(message.date), "dd/MM HH:mm");
                        $('#' + message.id + ' > .date').html(date);
                        $('#' + message.id + ' > .icon').removeClass('glyphicon-time');
                        $('#' + message.id + ' > .icon').addClass('glyphicon-ok');
                    });
                });

                socket.on('error', function (err) {
                    if (err == 'handshake unauthorized') return window.location = '/entrar';
                });

            });

            return this;
        },

        showStatus: function (connected, message) {
            if (connected) {
                $('.chat > .panel').removeClass('panel-danger');
                $('.chat > .panel').addClass('panel-primary');
            } else {
                $('.chat > .panel').removeClass('panel-primary');
                $('.chat > .panel').addClass('panel-danger');
            }
            
            $('.chat > .panel > .panel-heading > small').html(message);
        },

        showMessage: function (messageView) {
            var content = messageView.render();
            $('#messages').append(content.el);

            $('.panel-body').animate({ scrollTop: $('#messages').height() }, 1000);
        },

        partGuid: function () {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        },

        enter: function (e) {
            if (e.keyCode === 13) this.send(e);
        },

        send: function (e) {
            e.preventDefault();

            var $message = $('#message');
            if (!$message.val()) return;

            var messageId = this.partGuid();

            var message = { id: messageId, msg: $message.val(), date: null, user: 'eu' };
            var messageView = new MyMessageView({ model: message });
            this.showMessage(messageView);

            $message.val('');
        },

        toggle: function (e) {
            $('.chat > .panel > .panel-body, .chat > .panel > .panel-footer').toggle();
        }

    });

    return ChatView;

});
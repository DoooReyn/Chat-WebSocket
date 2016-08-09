#!/usr/bin/env node
 // 引入readline模块
var readline = require('readline');
var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket client connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
        connection.close();
        process.exit(0);
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("\nReceived: '" + message.utf8Data + "'");
        }
    });
    query(connection);
});

var getTimeStamp = function() {
    var date = new Date();
    var timeStamp = Date.parse(date) / 1000;
    return timeStamp;
};

var query = function(connection) {
    //创建readline接口实例
    var roomId = process.argv[2] || 0;
    var userId = process.argv[3] || 0;

    console.log('roomId, userId: ', roomId, userId);

    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    var actions = [
        'createRoom',
        'joinRoom',
        'exitRoom',
        'dismissRoom',
        'roomInfo'
    ];
    return function repeat() {
        rl.question("\n发送：", function(answer) {
            if (answer.length > 0) {
                var action = 'sendMessage';
                var index = actions.indexOf(answer);
                if (index) {
                    action = answer;
                }
                // for (var i in actions) {
                //     if (answer == actions[i]) {
                //         action = answer;
                //         break;
                //     }
                // }
                var request = {
                    'action': action,
                    'roomId': roomId,
                    'userId': userId,
                    'message': answer.toString(),
                    'dateline': getTimeStamp()
                };
                connection.sendUTF(JSON.stringify(request));
            }
            repeat();
        });
    }();
};

client.connect('ws://localhost:8888', 'echo-protocol');
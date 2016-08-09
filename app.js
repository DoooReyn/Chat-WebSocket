// 载入基础模块
Time = require('./utils/TimeStamp');
var readline   = require('readline');  
var httpProxy  = require('http');
var WebSocket  = require('websocket').server;
var RoomUtils  = require('./utils/RoomUtils');
var UserUtils  = require('./utils/UserUtils');
var ConnUtils  = require('./utils/ConnectionUtils');
var RoomGenerator = RoomUtils.RoomGen;
var RoomManager   = RoomUtils.RoomMgr;
var UserManager   = UserUtils.UserMgr;

// 创建服务器对象
var Server = new Object();

// 服务端基础配置和基础参数
Server.LoadServerConfig = function () {
	Server.SERVER_CONFIG = {
		'PORT' : 8888,
		'PROTOCOL' : 'echo-protocol',
		'TARGET' : {
			'SERVER' : -1,
			'WORLD'  : 0,
			'PRIVATE': 1,
			'ROOM'   : 2,
		},
		'ACTION' : {
			'SERVER' : 'onPush',
			'WORLD'  : 'onWorld',
			'PRIVATE': 'onPrivate',
			'ROOM'	 : 'onRoom',
		},
	};
	Server.Rooms = [];	// 所有的房间
	Server.Users = [];	// 所有的用户
	Server.G_ROOM       // 全局聊天室
	Server.UserID = 0;
};

// 创建一个 http 服务器
Server.CreateHttpServer = function() {
	var httpServer = httpProxy.createServer(function (req, res) {
	    console.log((new Date()) + ' Received request for ' + req.url);
	    res.writeHead(404);
	    res.end();
	}).on('error', function(err) {
		console.log(new Date(), 'error', err);
	}).listen(Server.SERVER_CONFIG.PORT, function() {
	    console.log((new Date()) + ' Server is listening on port ' + Server.SERVER_CONFIG.PORT);
	});
	return httpServer;
};

// 创建一个 WebSocket 服务器，使其挂载到 http 服务器上
Server.BindWebSocketServer = function (httpServer) {
	var wsServer = new WebSocket({
	    httpServer: httpServer,
	    // You should not use autoAcceptConnections for production
	    // applications, as it defeats all standard cross-origin protection
	    // facilities built into the protocol and the browser.  You should
	    // *always* verify the connection's origin and decide whether or not
	    // to accept it.
	    autoAcceptConnections: false
	});
	return wsServer;
}

// 初始化 WebSocket 服务
Server.InitWebSocketService = function (wsServer) {
	var originIsAllowed = function (origin) {
		// TODO 检查客户端来源是否允许
		return true;
	};

	var checkClientAvailable = function (req) {
		if (!originIsAllowed(req.origin)) {
	      req.reject();
	      console.log((new Date()) + ' Connection from origin ' + req.origin + ' rejected.');
	      return false;
	    }
	    return true;
	};

	wsServer.on('request', function (req) {
		if (!checkClientAvailable(req)) {
			// TODO error-report
			return;
		}

		var connection = req.accept(Server.SERVER_CONFIG.PROTOCOL, req.origin);
		var connUtils = new ConnUtils(Server, connection);

	    // 处理客户端验证的消息
		connection.on('action_verify', (jsonData) => {
			connUtils.verify(jsonData);
		});

		// 客户端消息转发
		connection.on('action_sendMessage', (jsonData) => {
			connUtils.postMessage(jsonData);
		});

	    // 创建本地聊天室
	    connection.on('action_createRoom', (jsonData) => {
	    	connUtils.createRoom(jsonData);
	    });

	    // 加入本地聊天室
	    connection.on('action_joinRoom', (jsonData) => {
	    	connUtils.joinRoom(jsonData);
	    });

	    // 退出本地聊天室
	    connection.on('action_exitRoom', (jsonData) => {
	    	connUtils.exitRoom(jsonData);
	    });

	    // 解散聊天室
	    connection.on('action_dismissRoom', (jsonData) => {
	    	connUtils.dismissRoom(jsonData);
	    });

	    // 查看聊天室信息
	    connection.on('action_roomInfo', (jsonData) => {
	    	connUtils.roomInfo(jsonData);
	    })

	    // 监听来自客户端请求的消息
	    connection.on('message', function (message) {
	    	if (message.type === 'utf8') {
	    		var utf8Data = message.utf8Data;
    			var jsonData 
    			try {
    				jsonData = JSON.parse(utf8Data);
    			} catch (exception) {
    				ConnUtils.sendError(connection, 'Parse Data Failed.');
    				return;
    			}
    			var action = jsonData.action;
    			if (!action) {
    				ConnUtils.sendError(connection, 'Params Error. No Action.');
    				return;
    			}
    			console.log((new Date()) + ' onMessage : ' + action);
    			connection.emit('action_'+action, jsonData);
	    	}
	    });

	    // 监听与客户端的连接状态
	    connection.on('close', function(reasonCode, description) {
	        console.log(new Date(), 'reasonCode, description : ', reasonCode, description);
	        connUtils.disconnect();
	    });

	    connUtils.connected();
	});
};

// 等待服务端推送
var WaitPush = function () {
	//创建readline接口实例
    var  rl = readline.createInterface({
        input  : process.stdin,
        output : process.stdout
    });

    // question方法
    return function repeat() {
        rl.question("\nPush：",function (answer) {
            if (answer.length > 0) {
            	Server.G_ROOM.broadcast(answer, true);
            }
            repeat();
        });
    } ();
};

// 启动 WebSocket 服务
Server.Start = function () {
	Server.LoadServerConfig();
	var hpServer   = Server.CreateHttpServer();
	var wsServer   = Server.BindWebSocketServer(hpServer);
	Server.RoomMgr = new RoomManager(Server);
	Server.UserMgr = new UserManager(Server);
	Server.G_ROOM  = new RoomGenerator(Server);
	Server.G_ROOM.setRoomManager(Server.RoomMgr);
	Server.RoomMgr.push(Server.G_ROOM);
	Server.InitWebSocketService(wsServer);
	WaitPush();
} ();
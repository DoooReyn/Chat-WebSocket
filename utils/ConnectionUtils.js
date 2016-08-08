// var Time = require('./TimeStamp');
var RoomManager = require('./RoomUtils').RoomMgr;

var ConnectionUtils = function (Server, connection) {
	this._sendJsonData = function(jsonData) {
		connection.sendUTF(JSON.stringify(jsonData));
	};

	this._sendError = function (action, errorMessage) {
		var jsonData = {
			'action' : action,
			'error'  : errorMessage,
			'dateline' : Time()
		};
		this._sendJsonData(jsonData);
	};

	this._removeFromGlobalRoom = function () {
		Server.G_ROOM.kick(connection);
		Server.UserMgr.remove(connection.userId);
		Server.RoomMgr.total();
		Server.UserMgr.total();
	};

	this.connected = function () {
		var userId = ++Server.UserID;
	    connection.userId = userId;
	    connection.Rooms = [];
	    connection.RoomMgr = new RoomManager(connection);
	    Server.G_ROOM.join(connection);
	    Server.UserMgr.push(userId);
	    Server.RoomMgr.total();
	    Server.UserMgr.total();
	};

	this.verify = function () {
		//TODO verifyData
		var jsonData = {
			'action' : 'verify',
			'from' 	 : -1,
			'userId' : connection.userId,
			'roomId' : 0,
			'message': 'OK',
			'dateline': Time()
		};
		this._sendJsonData(jsonData);
	};

	this.postMessage = function (jsonData) {
		var roomId = parseInt(jsonData.roomId) || 0;
		var userId = parseInt(jsonData.userId) || 0;
		console.log('try chat in room ' + roomId + ' with user ' + userId + '.');
		
		var room = Server.RoomMgr.find(roomId);
		if (room) {
			if (room.hasMember(connection)) {
				if (userId == 0) {
					room.broadcastExcludeSelf(jsonData.message, connection);
				} else {
					room.privatecast(jsonData.message, userId, connection);
				}
			} else {
				this._sendError(jsonData.action, 'not a member.');
			}
		} else {
			this._sendError(jsonData.action, 'room not found.');
		}
	};

	this.disconnect = function () {
		this._removeFromGlobalRoom();
		var rooms = connection.Rooms;
		for (var i in rooms) {
			rooms[i].kick(connection);
		}
	};

	this.createRoom = function () {
		connection.RoomMgr.create(Server, connection);
	};

	this.joinRoom = function (jsonData) {
		var roomId = parseInt(jsonData.roomId);
		var room = Server.RoomMgr.find(roomId);
		if (room) {
			room.join(connection);
		} else {
			this._sendError(jsonData.action, 'room not found.')
		}
	};

	this.exitRoom = function (jsonData) {
		var roomId = parseInt(jsonData.roomId) || 0;
		var room   = Server.RoomMgr.find(roomId);
		var action = jsonData.action;
		if (room) {
			if (room.isSystem()) {
				// 世界聊天不可以退出
				this._sendError(action, 'can not exit for on world room.');
				return;
			}
			if (room.owner == connection.userId) {
				// 创建者不可退出，只能解散
				this._sendError(action, 'can not exit for created by youself.');
				return;
			}
			room.kick(connection);
		} else {
			this._sendError(action, 'room not found');
		}
	};

	this.dismissRoom = function (jsonData) {
		var roomId = parseInt(jsonData.roomId);
		var room   = Server.RoomMgr.find(roomId);
		var action = jsonData.action;
		if (room) {
			if (room.isSystem()) {
				// 世界聊天不可以退出
				this._sendError(action, 'can not dismiss for on world room.');
				return;
			} 
			if (room.owner != connection.userId) {
				// 非创建者不可解散
				this._sendError(action, 'can not dismiss for not creator.');
				return;
			}
			room.dismiss();
		} else {
			this._sendError(action, 'room not found');
		}
	};

	this.roomInfo = function (jsonData) {
		var roomsInfo = connection.RoomMgr.roomsInfo();
		var action = jsonData.action;
		var jsonData = {
	        'action'   : action,
	        'room'     : roomsInfo,
	        'dateline' : Time()
	    };
	    this._sendJsonData(jsonData);
	}
};

module.exports = ConnectionUtils;
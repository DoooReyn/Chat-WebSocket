// var Time = require('./TimeStamp');
var RoomManager = require('./RoomUtils').RoomMgr;

var ConnectionUtils = function (connection) {
	var Server = GetServerInstance();

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

	this._sendSuccess = function (action, successMessage) {
		var jsonData = {
			'action' : action,
			'success': successMessage || 'success',
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

	this.queryUser = function (jsonData) {
		var userId = parseInt(jsonData.userId);
		var action = jsonData.action;
		if (userId >= 0) {
			var index = Server.UserMgr.find(userId);
			if (index >= 0) {
				this._sendSuccess(action, '用户' + userId + '在线.')
				return;
			}
		}
		this._sendError(action, '用户不存在');
	};

	this.queryRoom = function (jsonData) {
		var roomId = parseInt(jsonData.roomId);
		var action = jsonData.action;
		if (roomId > 0) {
			var room = Server.RoomMgr.find(roomId);;
			if (room) {
				this._sendSuccess(action, '房间有效');
				return;
			}
		}
		this._sendError(action, '房间不存在');
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
				this._sendError(jsonData.action, '不是房间的成员.');
			}
		} else {
			this._sendError(jsonData.action, '房间不存在.');
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
		if (room && room.roomId > 0) {
			room.join(connection);
			this._sendSuccess(jsonData.action, '已加入房间'+roomId);
		} else {
			this._sendError(jsonData.action, '房间不存在.');
		}
	};

	this.exitRoom = function (jsonData) {
		var roomId = parseInt(jsonData.roomId) || 0;
		var room   = Server.RoomMgr.find(roomId);
		var action = jsonData.action;
		if (room) {
			if (room.isSystem()) {
				// 世界聊天不可以退出
				this._sendError(action, '无法退出世界聊天.');
				return;
			}
			if (room.owner == connection.userId) {
				// 创建者不可退出，只能解散
				this._sendError(action, '无法退出自己创建的房间.');
				return;
			}
			room.kick(connection);
		} else {
			this._sendError(action, '房间不存在');
		}
	};

	this.dismissRoom = function (jsonData) {
		var roomId = parseInt(jsonData.roomId);
		var room   = Server.RoomMgr.find(roomId);
		var action = jsonData.action;
		if (room) {
			if (room.isSystem()) {
				// 世界聊天不可以退出
				this._sendError(action, '无法解散世界聊天');
				return;
			} 
			if (room.owner != connection.userId) {
				// 非创建者不可解散
				this._sendError(action, '只有创建者可以解散房间.');
				return;
			}
			room.dismiss();
		} else {
			this._sendError(action, '房间不存在.');
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
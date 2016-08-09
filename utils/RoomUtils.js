var Time = require('./TimeStamp');
var ArrayUtils = require('./ArrayUtils');

var getJoinRoomMessage = function (userId, room) {
    var message;
    if (room.isSystem()) {
        message = '用户' 
            + userId 
            + ' 上线了.\n当前在线人数：' 
            + room.total
            + '.\n当前在线用户：'
            + room.currentUsers().join(',')
            + '.';
    } else {
        message = '用户' 
            + userId 
            + ' 加入聊天室.\n当前聊天人数：' 
            + room.total
            + '.\n当前聊天用户：'
            + room.currentUsers().join(',')
            + '.';
    }
    return message;
};

var getExitRoomMessage = function (userId, room) {
    var message;
    if (room.isSystem()) {
        message = '用户' 
            + userId 
            + ' 下线了.\n当前在线人数：' 
            + room.total
            + '.\n当前在线用户：'
            + room.currentUsers().join(',')
            + '.';
    } else {
        message = '用户' 
            + userId 
            + ' 离开聊天室.\n当前聊天人数：' 
            + room.total
            + '.\n当前聊天用户：'
            + room.currentUsers().join(',')
            + '.';
    }
    return message;
};


// 创建聊天室
var RoomGenerator = function () {
    var Server = GetServerInstance();

	var room    = new Object();
	room.roomId = ++Server.RoomID;
	room.total  = 0;
	room.member = {};
	room.owner  = 0; // 0:system, >0:user

    room.isSystem = function () {
        return room.roomId == 0;
    };

    room.hasMember = function (connection) {
        return room.member[connection.userId];
    };

    room.currentUsers = function () {
    	var users = [];
    	for (var userId in room.member) {
    		users.push(userId);
    	}
    	return users;
    };

    room.setRoomManager = function (manager) {
        room.RoomMgr = manager;
    };

    room.setOwner = function (owner) {
        var index = Server.UserMgr.find(owner);
		if (typeof index == 'number' && index >= 0) {
			room.owner = owner;
		}
    };

    room.join = function (connection) {
    	var userId = connection.userId;
		if (!room.member[userId]) {
			room.member[userId] = connection;
			room.total++;
            connection.RoomMgr.push(room);

            var message = getJoinRoomMessage(userId, room);
            room.broadcast(message, room.isSystem());
		}
	};

    room.kickOne = function (userId) {
        if (room.member[userId] != undefined) {
            var target = room.member[userId];
            target.RoomMgr.removeSelf(room);
            delete room.member[userId];
            room.total--;
            return true;
        }
        return false;
    }

    room.kickByUserId = function (userId) {
        if (room.kickOne(userId)) {
            var message = getExitRoomMessage(userId, room);
            room.broadcast(message, room.isSystem());   
        }
    };

    room.kick = function (connection) {
    	room.kickByUserId(connection.userId);
    };

    room.broadcast = function (message, forcePush) {
    	var roomId = room.roomId;
    	var action = room.isSystem() ? 'onWorld' : 'onRoom';
    	if (forcePush) {
    		action = 'onPush';
    	}
    	var json = {
			'action' : action,
			'from'	 : -1,
			'roomId' : roomId,
			'message': message,
			'dateline': Time()
		};
		var data = JSON.stringify(json);
    	for (var userId in room.member) {
			room.member[userId].sendUTF(data);
    	}
        // console.log('broadcast :\n', json);
    };

    room.broadcastExcludeSelf = function (message, connection) {
    	var from = connection.userId;
    	var roomId = room.roomId;
    	var action = roomId == 0 ? 'onWorld' : 'onRoom';
    	var json = {
			'action' : action,
			'from'	 : from,
			'to'	 : roomId,
			'message': message,
			'dateline': Time()
		};
		var data = JSON.stringify(json);
    	for (var userId in room.member) {
    		if (userId != from) {
    			room.member[userId].sendUTF(data);
    		}
    	}
        // console.log('broadcast exclude :\n', json);
    };

    room.dismiss = function () {
    	var roomId = room.roomId;
        room.broadcast('聊天室'+room.roomId+'已解散.', true);
        for (var userId in room.member) {
            room.kickOne(userId);
        }
        Server.RoomMgr.removeSelf(room);
    	delete room;
    };

    room.privatecast = function (message, tUserId, connection) {
    	var from = connection.userId;
    	var roomId = room.roomId;
    	var json = {
			'action' : 'onPrivate',
			'from'	 : from,
			'to'	 : roomId,
			'message': message,
			'dateline': Time()
		};
		var data = JSON.stringify(json);
    	for (var userId in room.member) {
    		if (userId != from && userId == tUserId) {
    			room.member[userId].sendUTF(data);
    		}
    	}
        // console.log('privatecast :\n', json);
    };

    room.getRoomInfo = function () {
    	return {
			'roomId' : room.roomId,
			'member' : room.currentUsers(),
			'owner'	 : room.owner
		};
    };

	return room;
};

// 聊天室管理器
var RoomManager = function (Manager) {
    var Rooms = Manager.Rooms;

    this.index = function (fn) {
        ArrayUtils.each(Rooms, fn);
    };

    this.currentRooms = function () {
        var rooms = {};
        this.index(function (room) {
            rooms[room.roomId] = room;
        });
        return rooms;
    };

    this.total = function () {
        var total = Rooms.length;
        console.log('Total Rooms : ' + total);
        return Rooms.length;
    };

    this.find = function (roomId) {
        var rooms = this.currentRooms();
        return rooms[roomId];
    };

    this.create = function (server, connection) {
        var room = new RoomGenerator(server);
        var roomMgr = connection.RoomMgr;
        room.setRoomManager(roomMgr);
        room.setOwner(connection.userId);
        room.join(connection);
        server.RoomMgr.push(room);

        var jsonData = {
            'action' : 'createRoom',
            'room' : room.getRoomInfo(),
            'allRoom' : roomMgr.roomsInfo(),
            'dateline' : Time()
        };
        connection.sendUTF(JSON.stringify(jsonData));
    };

    this.push = function (room) {
        Rooms.push(room);
    };

    this.remove = function (roomId) {
        var roomIndex = this.find(roomId);
        if (roomIndex) {
            Rooms.splice(roomIndex, 1);
        }
    };

    this.removeSelf = function (room) {
        this.remove(room.roomId);
    };

    this.roomsInfo = function () {
        var rooms = [];
        this.index(function (room) {
            if (!room.isSystem()) {
                var roomInfo = room.getRoomInfo();
                rooms.push(roomInfo);
            }
        });
        return rooms;
    };
};

module.exports = {
    'RoomGen' : RoomGenerator,
    'RoomMgr' : RoomManager,
}

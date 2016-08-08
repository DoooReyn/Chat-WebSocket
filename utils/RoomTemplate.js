String.format = function(src){
    if (arguments.length == 0) return null;
    var args = Array.prototype.slice.call(arguments, 1);
    return src.replace(/\{(\d+)\}/g, function(m, i){
        return args[i];
    });
};

var timestamp = function () {
	var date = new Date(); 
	var timeStamp = Date.parse(date) / 1000;
	return timeStamp;
};

var RoomTemplate = function () {
	var t = this;

	this._id = 0;			// 房间号
	this._identifier ＝ '';	// 标识符
	this._description = '';	// 房间描述
	this._onwer = 0;		// 房间所有者
	this._level = 1;		// 房间等级
	this._createTime = 0;	// 创建时间
	this._member = [];		// 房间成员
	this._adminMaxNum = 2;	// 管理员最大数量 3
	this._adminCurNum = 0;	// 当前管理员数量
	this._memberMaxNum = 10;// 成员数量
	this._applyMemberList = []; // 申请加入的成员名单
	this._memberOffice = {'owner' : 0, 'admin' : 1, 'member' : 2];

	this.init = function (identifier, description, conn) {
		this._id = ++GLOBAL_DISPATCH_ROOM_ID;
		this._identifier = identifier;
		this._description = description;
		var owner = new MemberGenerator(conn);
		owner.setOffice(this._memberOffice.onwer);
		this._owner = owner;
	};

	var traverseMember = function (fn) {
		var ret = [];
		var members = t._member;
		for (var i in members) {
			var member = members[i];
			if (fn(i, member)) {
				ret.push(member);
			}
		}
	};

	this.filterMember = function (condition, value) {
		var filterResult = [];

		switch (condition) {
			case 'id' :
				filterResult = traverseMember(function (i, member) {
					return member._id == value;
				});
				break;
			case 'office':
				filterResult = traverseMember(function (i, member) {
					return member._office == value;
				});
				break;
			case 'userName':
				filterResult = traverseMember(function (i, member) {
					return member._origin.userName == value;
				});
				break;
			case 'userId':
				filterResult = traverseMember(function (i, member) {
					return member._origin.userId == value;
				})
				break;
			default:
				break;
		};

		return filterResult;
	};

	this.indexMember = function (id) {
		for (var i in t._member) {
			var member = t._member;
			if (member._id == id) {
				return member;
			}
		}
		return null;
	}

	this.addApplyRequest = function (conn) {
		var target;
		for (var i in this._applyMemberList) {
			var ele = this._applyMemberList[i];
			if (ele._userId == conn.userId) {
				target = i;
			}
		}
		if (target) {
			console.log('申请已存在，请不要重复申请.');
		} else {
			this._applyMemberList.push(conn);
			// TODO
			// Should post this apply notice to all admins and owner
		}
	};

	var MemberGenerator = function (conn) {
		if (t._member.length >= t._memberMaxNum) {
			console.log('房间人数已达上限');
			return null;
		}

		this._id       = t._member.length + 1;
		this._office   = t._memberOffice.member;
		this._origin   = conn;
		this._joinTime = timestamp();
		t._member.push(this);

		this.setOffice = function (office) {
			this.office = office;
		};
		this.isOwner = function () {
			return this._office == t._memberOffice.owner;
		};
		this.isAdmin = function () {
			return this._office == t._memberOffice.admin;
		};
		this.isMember = function () {
			return this._office == t._memberOffice.member;
		};
		this.isOverMember = function () {
			var office = t._memberOffice;
			return this._office == office.owner || this._office == office.admin;
		};
		this.addMember = function (conn) {
			var member = new MemberGenerator(conn);
			t._member.push(member);
		};
		this.passMember = function (conn) {
			if (this.isOverMember()) {
				var target
				for (var i in t._applyMemberList) {
					var apply_coon = t._applyMemberList[i];
					if (apply_coon.userId == conn.userId) {
						target = i;
						break;
					}
				}
				if (target) {
					t._applyMemberList.splice(target, 1);
					this.addMember(conn);
				} else {
					console.log('很抱歉，我们找不到这个用户Id'+conn.userId);
					// this._origin.sendError('很抱歉，我们找不到这个用户Id'+conn.userId);
				}
			} else {
				console.log('您没有审核成员加入的操作权限哦');
				// this._origin.sendError('您没有审核成员加入的操作权限哦');
			}
		};
		this.modifyIdentifier = function (identifier) {
			if (this.isOverMember()) {
				var cur = this._identifier = identifier;
				console.log(this._origin.userName + '将房间标识符修改为' + cur);
				// t.broadcast(this._origin.userName + '将房间标识符修改为' + cur);
			} else {
				console.log('您没有修改房间标识符的权限哦');
				// this._origin.sendError('您没有修改房间标识符的权限哦');
			}
		};
		this.modifyDescription = function (desctiption) {
			if (this.isOverMember()) {
				var cur = this._desctiption = desctiption;
				console.log(this._origin.userName + '将房间说明修改为' + cur);
				// t.broadcast(this._origin.userName + '将房间说明修改为' + cur);
			} else {
				console.log('您没有修改房间描述的权限哦');
				// this._origin.sendError('您没有修改房间描述的权限哦');
			}
		};
		this.relieveAdmin = function (member) {
			if (this.isOwner()) {
				if (member.isAdmin()) {
					member.setOffice(t._memberOffice.member);
					--t._adminCurNum;
					var msg = String.format('{0}被降级为普通成员', member._origin.userName);
					console.log(msg);
					// this._origin.sendMessage(msg);
					// member._origin.sendMessage('您已被降级为普通成员');
				} else {
					console.log(member._origin.userName + '是普通成员');
					// this._origin.sendError(member._origin.userName + '是普通成员');
				}
			} else {
				console.log('您没有移除管理员的权限哦');
				// this._origin.sendError('您没有移除管理员的权限哦');
			}
		};
		this.assignAdmin = function (member) {
			if (this.isOwner()) {
				if (member.isMember()) {
					if (t._adminCurNum == t._adminMaxNum) {
						console.log('管理员数量已达上限');
						// this._origin.sendError('管理员数量已达上限');
						return
					}
					member.setOffice(t._memberOffice.admin);
					++t._adminCurNum;
					var msg = String.format('{0}被提升为管理员', member._origin.userName);
					console.log(msg);
					// this._origin.sendMessage(msg);
					// member._origin.sendMessage('您已被降级为普通成员');
				} else {
					console.log(member._origin.userName + '已经是管理员了');
					// this._origin.sendError(member._origin.userName + '是普通成员');
				}
			} else {
				console.log('您没有设置管理员的权限哦');
				// this._origin.sendError('您没有移除管理员的权限哦');
			}
		};
		this.kick = function (member) {
			var target 
			for (var i in t._member) {
				var m = t._member[i];
				if (m._id == member._id) {
					target = i;
					break;
				}
			}
			if (target) {
				t._member.splice(target, 1);
			} else {
				var msg = '成员不存在';
				console.log(msg);
				// this._origin.sendError(msg);
			}
		}
		this.kickMember = function (member) {
			var errorTip = function () {
				var msg = String.format('您没有踢出{0}的权限', member._origin.userName);
				console.log(msg);
				// this._origin.sendError(msg);
			};

			if (this.isOverMember()) {
				if (member.isMember()) {
					this.kick(member);
				} else if (member.isAdmin() && this.isOwner()) {
					this.relieveAdmin(member);
					this.kick(member);
				} else {
					errorTip();
				}
			} else {
				errorTip();
			}
		};
		this.exitRoom = function () {
			if (this.isOwner()) {
				var msg = '您无法退出自己创建的房间，如果您坚持退出，请尝试解散';
				console.log(msg);
				// this._origin.sendError(msg);
			} else {
				if (this.isAdmin()) {
					--t._adminCurNum;
				}
				this.kick(member);
				var msg = String.format('{0}退出了房间', member._origin.userName)
				console.log(msg);
				// t.broadcast(msg);
			}
		};
		this.dismiss = function () {
			if (this.isOwner()) {
				var msg = String.format('房间{0}已解散', t._identifier);
				for (var i in t._member) {
					t._member[i]._origin.sendMessage(msg);
				}
				console.log(msg);
				t.removeFromGlobal();
			} else {
				var msg = '您没有解散房间的权限';
				console.log(msg);
				// this._origin.sendError(msg);
			}
		};
	};

	this.removeFromGlobal = function () {
		var target;
		for (var i in G_ROOMS) {
			var room = G_ROOMS[i];
			if (room._id == this._id) {
				target = i;
			}
		}
		if (target) {
			G_ROOMS.splice(target, 1);
		} else {
			console.log('没有找到该房间')
		}
	};
};

module.exports = RoomTemplate;
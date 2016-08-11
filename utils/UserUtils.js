// var Time = require('./TimeStamp');
var ArrayUtils = require('./ArrayUtils');

// 用户管理器
var UserManager = function() {
    var Server = GetServerInstance();

    var Users = Server.Users;
    this.index = function(fn) {
        ArrayUtils.each(Users, fn);
    };
    this.total = function() {
        var total = Users.length;
        console.log('Total Users : ' + total);
        return total;
    };
    this.find = function(userId) {
        return Users.indexOf(userId);
    };
    this.push = function(userId) {
        Users.push(userId);
    };
    this.remove = function(userId) {
        var userIndex = this.find(userId);
        if (userIndex >= 0) {
            Users.splice(userIndex, 1);
        }
    };
}

module.exports = {
    'UserMgr': UserManager,
};
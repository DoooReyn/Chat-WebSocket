// 获取当前时间戳
var TimeStamp = function () {
	var date = new Date(); 
	var timeStamp = Date.parse(date) / 1000;
	return timeStamp;
};

module.exports = TimeStamp;
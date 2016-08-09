var ArrayEach = function (array, fn) {
	for (var i in array) {
		var val = array[i];
		if (fn) { 
			var ret = fn(val, i); 
			if (ret) {
				break;
			}
		}
	}
};

module.exports = {
	each : ArrayEach,
};
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

var ArrayFind = function (array, val) {
	var target = null;
	ArrayEach(array, function (rval, i) {
		if (rval == val) {
			target = i;
			return true;
		}
	});
	return target;
};

module.exports = {
	each : ArrayEach,
	find : ArrayFind,
};
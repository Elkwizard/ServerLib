module("hash", self => ({
	generate(length = 8) {
		let result = "";
		for (let i = 0; i < length; i++) result += String.fromCharCode(~~(57 * Math.random()) + 65);
		return result;
	}
}));
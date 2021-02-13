module("path", self => ({
	isRoot(path) {
		return /^((http(s?)|file):\/\/|[A-Z]:\/|file:(\/\/\/|\\\\\\))/g.test(path);
	},
	findRoot(path) {
		let rootPrefix = path.match(/^((http(s?)|file):\/\/|[A-Z]:\/|file:(\/\/\/|\\\\\\))/g);
		return rootPrefix ? rootPrefix[0] : "";
	},
	simplify(path) {
		let rootPrefix = self.findRoot(path);
		if (rootPrefix) {
			path = path.slice(rootPrefix.length);
		}

		let pieces = path.split("/");
		let resultPath = [];
		for (let i = 0; i < pieces.length; i++) {
			if (pieces[i] === ".") continue;
			if (pieces[i] === "..") {
				resultPath.pop();
				continue;
			}
			resultPath.push(pieces[i]);
		}
		return rootPrefix + resultPath.join("/");
	},
	join2Paths(a, b) {
		if (self.isRoot(b)) return self.simplify(b);
		if (a && b) return self.simplify(`${a}/${b}`);
		if (a) return self.simplify(a);
		if (b) return self.simplify(b);
		return "";
	},
	join(...paths) {
		let a = paths[0];
		for (let i = 1; i < paths.length; i++) a = self.join2Paths(a, paths[i]);
		return a;
	}
}));
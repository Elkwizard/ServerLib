module("request", self => {
	function makeURL(path, params = { }) {
		const paramList = [];
		for (const key in params) paramList.push(`${key}=${escape(params[key])}`);
		return path + (paramList.length ? "?" : "") + paramList.join("&");
	}

	const root = location.pathname.replace(/[\\\/](\w+)(\.(\w+))*\.html$/, "");

	function absoluteURL(url) {
		const [path, params] = url.split("?");
		const abs = server.path.join(root, path) + (params ? "?" + params : "");
		return abs;
	}

	return {
		postMessage(type, data) {
			const xhr = new XMLHttpRequest();
			xhr.open("POST", "", true);
			xhr.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
			xhr.send(JSON.stringify({ type, data }));
			return new Promise((resolve, reject) => {
				xhr.onreadystatechange = () => {
					if (xhr.readyState === XMLHttpRequest.DONE) {
						if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
						else reject(xhr.status);
					}
				};
			});
		},
		authenticate(folder, password) {
			return self.postMessage("AUTH", { folder: absoluteURL(folder), password }).then(bool => !!bool);
		},
		setString(url, string, password) {
			const xhr = new XMLHttpRequest();
			xhr.open("PUT", absoluteURL(makeURL(url, { password })), true);
			xhr.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
			xhr.send(string);
			return new Promise((resolve, reject) => {
				xhr.onreadystatechange = () => {
					if (xhr.readyState === XMLHttpRequest.DONE) {
						if (xhr.status === 200) resolve();
						else reject(xhr.status);
					}
				};
			});
		},
		getString(url) {
			const xhr = new XMLHttpRequest();
			xhr.open("GET", absoluteURL(url), true);
			xhr.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
			return new Promise((resolve, reject) => {
				xhr.onreadystatechange = () => {
					if (xhr.readyState === XMLHttpRequest.DONE) {
						if (xhr.status === 0 || xhr.status === 200) resolve(xhr.responseText);
						else reject(xhr.status);
					}
				};
				xhr.send();
			});
		},
		set(url, data, password) {
			return self.setString(url, JSON.stringify(data), password);
		},
		get(url) {
			return self.getString(url).then(JSON.parse.bind(JSON));
		}
	};
});
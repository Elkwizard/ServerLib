const http = require("http");
const fs = require("fs");
const path = require("path");

function log(...msg) {
	console.log(...msg);
}

const socket = {
	sockets: new Map(),
	onreceive: null,
	get ids() { return this.sockets.keys(); },
	send(id, value) {
		if (this.sockets.has(id)) this.sockets.get(id).push(value);
	}
};

function handle(type, data) {
	switch (type) {
		case "AUTH": {
			return authenticate(data);
		};
		case "SOCKETOPEN": {
			const id = data;
			socket.sockets.set(id, []);
			return Promise.resolve(socket.sockets.size);
		};
		case "SOCKETCLOSE": {
			const id = data;
			socket.sockets.delete(id);
			return Promise.resolve(socket.sockets.size);
		};
		case "SOCKETGET": {
			const id = data;
			if (socket.sockets.has(id) && socket.sockets.get(id).length) {
				const value = socket.sockets.get(id).shift();
				return Promise.resolve({ value });
			}
			return Promise.resolve(null);
		};
		case "SOCKETPUT": {
			const { id, value } = data;
			if (socket.onreceive !== null) socket.onreceive(id, value);
			return Promise.resolve(null);
		};
	}

}

function authenticate(password) {
	return new Promise(resolve => {
		fs.readFile("auth/password.hide.txt", "utf-8", (err, result) => {
			if (err) {
				resolve(false);
			} else {
				resolve(password === result);
			}
		});
	});
}

function tableRow(a, b, c, ca, cb, cc) {
	if (onDomain) return [a, b, c].join(", ");
	return `║ ${ca}${a}\x1b[0m` + " ".repeat(METHOD_WIDTH - a.length) + ` ║ ${cb}${b}\x1b[0m` + " ".repeat(STATUS_WIDTH - b.length) + "║ " + `${cc}${c}\x1b[0m`;
}

const METHOD_WIDTH = 25;
const STATUS_WIDTH = 25;

const tableDivider = "╠" + "═".repeat(2 + METHOD_WIDTH) + "╬" + "═".repeat(1 + STATUS_WIDTH) + "╬" + "═".repeat(68);

const server = http.createServer((request, response) => {
	let { method, url, headers } = request;

	let body = "";
	request
		.on("data", chunk => body += chunk)
		.on("end", () => {
			response.on("error", err => {
				console.error(err);
			});

			const params = {};
			if (url.indexOf("?") > -1) {
				for (const param of url.slice(url.indexOf("?") + 1).split("&").map(q => q.split("="))) {
					params[param[0]] = unescape(param[1]);
				}
				url = url.slice(0, url.indexOf("?"));
			}

			const filePath = path.join(".", url);
			
			function finish(msg, subtype, log) {
				if (log) {
					console.log(tableRow(method + (subtype ? ":" + subtype : ""), `${response.statusCode} ${msg}`, url, "\x1b[1m\x1b[31m", "\x1b[33m", "\x1b[32m"));
					if (!onDomain) console.log(tableDivider);
				}
				response.end();
			}

			switch (method) {
				case "GET": {
					for (const name in headers) response.setHeader(name, headers[name]);

					if (/\.hide/.test(url)) {
						response.statusCode = 401;
						finish("HIDDEN");
					} else {
						fs.readFile(filePath, (err, result) => {
							if (err) {
								response.statusCode = 404;
								finish("NOT READ");
							} else {
								response.statusCode = 200;
								response.write(result);
								finish("READ");
							}
						});
					}
					break;
				};
				case "PUT": {
					if ("password" in params) {
						authenticate(params.password).then(success => {
							if (success) {
								fs.writeFile(filePath, body, "utf-8", err => {
									if (err) {
										response.statusCode = 500;
										finish("NOT WRITTEN");
									} else {
										response.statusCode = 200;
										response.write("success");
										finish("WRITTEN");
									}
								});
							}
						});
					}
					break;
				};
				case "POST": {
					try {
						const { type, data } = JSON.parse(body);
						handle(type, data).then(result => {
							response.write(JSON.stringify(result));
							finish("RESPONDED", type, type !== "SOCKETGET");
						});
					} catch (err) {
						response.statusCode = 200;
						console.error(err)
						finish("UNKNOWN POST");
					}
					break;
				};
			}
		});
});

const onDomain = false;
server.listen(8080, onDomain ? "hhhost.me" : "localhost");

eval(fs.readFileSync("./ServerLib/server/socket.js", "utf-8"));

server.on("listening", () => {
	log("listening on port 8080");

	// create table header

	if (!onDomain) {		
		console.log("╔" + "═".repeat(2 + METHOD_WIDTH) + "╦" + "═".repeat(1 + STATUS_WIDTH) + "╦" + "═".repeat(68));
		console.log(tableRow("METHOD", "STATUS", "URL", "\x1b[1m", "\x1b[1m", "\x1b[1m"));
		console.log(tableDivider);
	}

});
const http = require("http");
const fs = require("fs");
const path = require("path");

function log(...msg) {
	console.log(...msg);
}

class SocketClient {
	constructor(id) {
		this.messages = [];
		this.poll = null;
		this.id = id;
	}
	close() {
		if (this.poll !== null) this.poll.resolve(null);
	}
}

class SocketServer {
	constructor(id, path) {
		this.id = id;
		this.onreceive = null;
		this.clientSockets = new Map();
		const socket = this;
		eval(fs.readFileSync(path, "utf-8"));
	}
	get clients() {
		return new Set(this.clientSockets.keys());
	}
	openSocket(id) {
		this.clientSockets.set(id, new SocketClient(id));
		return null;
	}
	closeSocket(id) {
		if (this.clientSockets.has(id)) {
			this.clientSockets.get(id).close();
			this.clientSockets.delete(id);
		}
		return null;
	}
	socketGet(id) {
		if (this.clientSockets.has(id)) {
			const socket = this.clientSockets.get(id);
			if (socket.messages.length) {
				const result = { messages: socket.messages };
				socket.messages = [];
				return Promise.resolve(result);
			}
			return new Promise(resolve => socket.poll = { resolve });
		}
		return Promise.resolve(null);
	}
	socketPut(id, message) {
		if (this.onreceive !== null) this.onreceive(id, message);
		return null;
	}
	send(id, message) {
		if (this.clientSockets.has(id)) {
			const socket = this.clientSockets.get(id);
			socket.messages.push(message);
			if (socket.poll !== null) {
				const response = { messages: socket.messages };
				socket.messages = [];
				socket.poll.resolve(response);
			}
		}
		return null;
	}
}

const socketServers = { };

function handle(type, data) {
	let socketServer;
	if (type.startsWith("SOCKET")) socketServer = socketServers[data.server];	

	switch (type) {
		case "AUTH": return authenticate(data);
		
		//sockets
		case "SOCKETOPEN": 
			if (socketServer === undefined) return Promise.resolve(false);
			socketServer.openSocket(data.id);
			return Promise.resolve(true);
		case "SOCKETCLOSE": return Promise.resolve(socketServer.closeSocket(data.id));
		case "SOCKETGET": return socketServer.socketGet(data.id);
		case "SOCKETPUT": return Promise.resolve(socketServer.socketPut(data.id, data.message));
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
			
			function finish(msg, subtype, log = true) {
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
							finish("RESPONDED", type);
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

const onDomain = process.platform !== "win32";
server.listen(8080, onDomain ? "hhhost.me" : "localhost");

function getFlag(flag) {
	const [_node, _program, ...args] = process.argv;
	for (const arg of args) {
		if (arg.slice(0, 2) === "--") {
			const [name, value] = arg.split("=");
			if (name === flag) return value;
		} else {
			if (flag === arg) return true;
		}
	}
	return null;
}

const socketServerPaths = getFlag("--socket");
if (socketServerPaths !== null) {
	const socketServerMap = socketServerPaths.split(",").map(server => server.split(":"));
	for (const [key, value] of socketServerMap) socketServers[key] = new SocketServer(key, value);
}

server.on("listening", () => {
	log("listening on port 8080");

	// create table header

	if (!onDomain) {		
		console.log("╔" + "═".repeat(2 + METHOD_WIDTH) + "╦" + "═".repeat(1 + STATUS_WIDTH) + "╦" + "═".repeat(68));
		console.log(tableRow("METHOD", "STATUS", "URL", "\x1b[1m", "\x1b[1m", "\x1b[1m"));
		console.log(tableDivider);
	}

});
module("socket", self => ({
	async open(id, socketServer) {
		if (arguments.length === 1) {
			socketServer = arguments[0];
			id = server.hash.generate();
		}

		let open = true;
		
		const socket = {
			id,
			server: socketServer,
			onreceive: null,
			onclose: null,
			send(message) {
				server.request.postMessage("SOCKETPUT", { id, server: socketServer, message }).then(data => {
					if (data !== null && socket.onreceive !== null) for (const message of data.messages) socket.onreceive(message);
				});
			},
			close() {
				if (this.onclose !== null) this.onclose();
				if (open) {
					open = false;
					return server.request.postMessage("SOCKETCLOSE", { id, server: socketServer });
				}
				return Promise.resolve(null);
			}
		};

		if (!(await server.request.postMessage("SOCKETOPEN", { id, server: socketServer })))
			throw new Error(`Socket server '${socketServer}' does not exist`);

		const poll = () => {
			server.request.postMessage("SOCKETGET", { id, server: socketServer }).then(data => {
				if (data === null) return socket.close();
				if (socket.onreceive !== null) for (const message of data.messages) socket.onreceive(message);
				if (open) poll();
			});
			socket.serverMessages = [];
		};

		poll();
	
		return socket;
	}
}));
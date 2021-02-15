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
			serverMessages: [],
			onreceive: null,
			send(value) {
				this.serverMessages.push(value);
			},
			close() {
				if (open) {
					open = false;
					return server.request.postMessage("SOCKETCLOSE", { id, server: socketServer });
				}
				return Promise.resolve(null);
			}
		};

		if (!(await server.request.postMessage("SOCKETOPEN", { id, server: socketServer })))
			throw new Error(`Socket server '${socketServer}' does not exist`);

		const update = () => {
			server.request.postMessage("SOCKETUPDATE", { id, messages: socket.serverMessages, server: socketServer }).then(data => {
				if (socket.onreceive !== null && data !== null) for (const message of data.messages) socket.onreceive(message);
				if (open) update();
			});
			socket.serverMessages = [];
		};

		update();
	
		return socket;
	}
}));
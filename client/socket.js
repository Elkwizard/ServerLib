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
			send(value) {
				return server.request.postMessage("SOCKETPUT", { id, server: socketServer, value });
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

		function requestNewData() {
			server.request.postMessage("SOCKETGET", { id, server: socketServer }).then(data => {
				if (socket.onreceive !== null && data !== null) socket.onreceive(data.value);
				if (open) requestNewData();
			});
		}
		requestNewData();
	
		return socket;
	}
}));
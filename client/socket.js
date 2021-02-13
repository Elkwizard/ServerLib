module("socket", self => {

	let open = false;
	let id = null;
	
	function requestNewData() {
		server.request.postMessage("SOCKETGET", id).then(data => {
			if (self.onreceive !== null && data !== null) self.onreceive(data.value);
			if (open) requestNewData();
		});
	}

	return {
		onreceive: null,
		get id() { return id; },
		open(newID = String(Math.random())) {
			console.log(newID);
			id = newID;
			if (!open) {
				open = true;
				return server.request.postMessage("SOCKETOPEN", id).then(openSockets => (requestNewData(), openSockets));
			}
			return null;
		},
		send(value) {
			return server.request.postMessage("SOCKETPUT", { id, value });
		},
		close() {
			if (open) {
				open = false;
				return server.request.postMessage("SOCKETCLOSE", id);
			}
			return null;
		}
	};
});
socket.onreceive = (id, value) => {
	for (const socketID of socket.ids) socket.send(socketID, { id, ...value });
};
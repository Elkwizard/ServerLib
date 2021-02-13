const server = { };
function module(name, create) {
	server[name] = { };
	const result = create(server[name]);
	for (const key in result) server[name][key] = result[key];
	return result;
}
server.loaded = (async () => {
	let path = document.currentScript.src;
	path = path.slice(0, path.length - 6);
	const scripts = ["path", "request"];
	for (let script of scripts) {
		const el = document.createElement("script");
		el.src = `${path}${script}.js`;
		await new Promise(resolve => {
			el.onload = resolve;
			document.head.appendChild(el);
		});
	}
	return server;
})();
import { HttpBunRuntimeAdapter } from "./external/http/BunRuntimeAdapter";
import { HonoAdapter } from "./external/http/HonoAdapter";
import { HttpMethod } from "./infra/http/HttpServer";

async function main() {
	const runtime = new HttpBunRuntimeAdapter();
	const restApi = new HonoAdapter(runtime);

	restApi.register(HttpMethod.GET, "/health", async (_, res) => {
		res.headers = { "Content-Type": "text/plain" };
		res.body = "OK";
		return res;
	});

	await restApi.listen(3000);
}

if (import.meta.main) {
	main();
}

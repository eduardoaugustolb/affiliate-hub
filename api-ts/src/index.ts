import { HttpBunRuntimeAdapter } from "./external/http/BunRuntimeAdapter";
import { HonoAdapter } from "./external/http/HonoAdapter";
import {
	EnvironmentVarsValidator,
	environmentVarsSchema,
} from "./external/validation/environment/ZodEnvironmentVarsValidator";
import { HttpMethod } from "./infra/http/HttpServer";

async function main() {
	const runtime = new HttpBunRuntimeAdapter();
	const restApi = new HonoAdapter(runtime);

	restApi.register(HttpMethod.GET, "/health", async (_, res) => {
		res.headers = { "Content-Type": "text/plain" };
		res.body = "OK";
		return res;
	});

	const envVarsIsValid = await new EnvironmentVarsValidator(
		environmentVarsSchema,
	).validate(process.env);
	if (!envVarsIsValid) {
		throw new Error("Invalid environment variables");
	}

	await restApi.listen(3000);
}

if (import.meta.main) {
	main();
}

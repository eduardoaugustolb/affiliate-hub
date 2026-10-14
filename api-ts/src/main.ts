import { BunRuntimeAdapter } from "./external/http/BunRuntimeAdapter";
import { HonoHttpServerAdapter } from "./external/http/HonoHttpServerAdapter";
import {
	EnvironmentVarsValidator,
	environmentVarsSchema,
} from "./external/ZodEnvironmentVarsValidator";
import { HttpMethod } from "./infra/http/HttpRestServer";

async function main() {
	const runtime = new BunRuntimeAdapter();
	const restApi = new HonoHttpServerAdapter(runtime);

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

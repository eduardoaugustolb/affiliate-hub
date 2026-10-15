import { AuthenticateUser } from "./application/usecases/commands/AuthenticateUser";
import { GetAuthenticatedUser } from "./application/usecases/queries/GetAuthenticatedUser";
import { BunTokenGenerator } from "./external/BunTokenGenerator";
import { BunUUIDIdGenerator } from "./external/BunUUIDIdGenerator";
import { BunSQLAdapter } from "./external/database/BunSQLAdapter";
import { SessionDAOSQL } from "./external/database/DAOs/SessionDAOSQL";
import { UserDAOSQL } from "./external/database/DAOs/UserDAOSQL";
import { BunPasswordHasher } from "./external/hash/BunPasswordHasher";
import { BunSessionTokenHasher } from "./external/hash/BunSessionTokenHasher";
import { BunRuntimeAdapter } from "./external/http/BunRuntimeAdapter";
import { HonoHttpServerAdapter } from "./external/http/HonoHttpServerAdapter";
import { RuntimeDateProvider } from "./external/RuntimeDateProvider";
import { environmentVarsSchema, ZodValidator } from "./external/ZodValidator";
import { AuthRestController } from "./infra/controllers/http/AuthRestController";
import { SessionRepositoryDatabase } from "./infra/database/repositories/SessionRepositoryDatabase";
import { UserRepositoryDatabase } from "./infra/database/repositories/UserRepositoryDatabase";
import { HttpMethod } from "./infra/http/HttpRestServer";

async function main() {
	const envVarsIsValid = await new ZodValidator(environmentVarsSchema).validate(
		process.env,
	);
	const {
		DATABASE_URL,
		SESSION_COOKIE_NAME = process.env.NODE_ENV === "production"
			? "__Host-session"
			: "session",
	} = process.env;
	if (!envVarsIsValid || !DATABASE_URL) {
		throw new Error("Invalid environment variables");
	}

	const runtime = new BunRuntimeAdapter();
	const restApi = new HonoHttpServerAdapter(runtime);
	const database = new BunSQLAdapter({ dbUrl: DATABASE_URL });
	const idGenerator = new BunUUIDIdGenerator();
	const dateProvider = new RuntimeDateProvider();
	const userRepo = new UserRepositoryDatabase(
		new UserDAOSQL(database),
		idGenerator,
	);
	const sessionRepo = new SessionRepositoryDatabase(
		new SessionDAOSQL(database),
		idGenerator,
		dateProvider,
	);
	const sessionTokenHasher = new BunSessionTokenHasher();
	const authenticateUser = new AuthenticateUser(
		userRepo,
		sessionRepo,
		dateProvider,
		new BunPasswordHasher(),
		new BunTokenGenerator(),
		sessionTokenHasher,
	);
	const getAuthenticatedUser = new GetAuthenticatedUser(
		userRepo,
		sessionRepo,
		dateProvider,
	);

	new AuthRestController(
		restApi,
		authenticateUser,
		getAuthenticatedUser,
		SESSION_COOKIE_NAME,
		sessionTokenHasher,
	);
	restApi.register(HttpMethod.GET, "/health", async (_, res) => res.text("OK"));

	try {
		await restApi.listen(Number(process.env.PORT ?? 3000));
	} catch (error) {
		await database.close();
		throw error;
	}
}

if (import.meta.main) {
	main();
}

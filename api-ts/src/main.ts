import { SessionAuthenticator } from "./application/SessionAuthenticator";
import { AuthenticateUser } from "./application/usecases/commands/AuthenticateUser";
import { CreateProduct } from "./application/usecases/commands/CreateProduct";
import { DeleteProduct } from "./application/usecases/commands/DeleteProduct";
import { Logout } from "./application/usecases/commands/Logout";
import { UpdateProduct } from "./application/usecases/commands/UpdateProduct";
import { GetAuthenticatedUser } from "./application/usecases/queries/GetAuthenticatedUser";
import { GetProductByCode } from "./application/usecases/queries/GetProductByCode";
import { ListProducts } from "./application/usecases/queries/ListProducts";
import { ResolveProduct } from "./application/usecases/queries/ResolveProduct";
import { BunProductCodeGenerator } from "./external/BunProductCodeGenerator";
import { BunTokenGenerator } from "./external/BunTokenGenerator";
import { BunUUIDIdGenerator } from "./external/BunUUIDIdGenerator";
import { BunSQLAdapter } from "./external/database/BunSQLAdapter";
import { ProductDAOSQL } from "./external/database/DAOs/ProductDAOSQL";
import { SessionDAOSQL } from "./external/database/DAOs/SessionDAOSQL";
import { UserDAOSQL } from "./external/database/DAOs/UserDAOSQL";
import { BunPasswordHasher } from "./external/hash/BunPasswordHasher";
import { BunSessionTokenHasher } from "./external/hash/BunSessionTokenHasher";
import { BunRuntimeAdapter } from "./external/http/BunRuntimeAdapter";
import { HonoHttpServerAdapter } from "./external/http/HonoHttpServerAdapter";
import { RuntimeDateProvider } from "./external/RuntimeDateProvider";
import { environmentVarsSchema, ZodValidator } from "./external/ZodValidator";
import { AuthRestController } from "./infra/controllers/http/AuthRestController";
import { ProductResolverRestController } from "./infra/controllers/http/ProductResolverRestController";
import { ProductRestController } from "./infra/controllers/http/ProductRestController";
import { ProductRepositoryDatabase } from "./infra/database/repositories/ProductRepositoryDatabase";
import { SessionRepositoryDatabase } from "./infra/database/repositories/SessionRepositoryDatabase";
import { UserRepositoryDatabase } from "./infra/database/repositories/UserRepositoryDatabase";
import { HttpMethod } from "./infra/http/HttpRestServer";

async function main() {
	const envVarsIsValid = await new ZodValidator(environmentVarsSchema).validate(
		process.env,
	);
	const {
		DATABASE_URL,
		SESSION_COOKIE_NAME = process.env.NODE_ENV === "production" ||
		process.env.BUN_ENV === "production"
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
		sessionTokenHasher,
	);
	const sessionAuthenticator = new SessionAuthenticator(
		userRepo,
		sessionRepo,
		sessionTokenHasher,
		dateProvider,
	);
	const getAuthenticatedUser = new GetAuthenticatedUser(sessionAuthenticator);
	const productDao = new ProductDAOSQL(database);
	const productRepo = new ProductRepositoryDatabase(productDao, idGenerator);
	const productCodeGenerator = new BunProductCodeGenerator();
	new ProductRestController(
		restApi,
		new CreateProduct(productRepo, productCodeGenerator, sessionAuthenticator),
		new GetProductByCode(productDao),
		SESSION_COOKIE_NAME,
		new UpdateProduct(productRepo, sessionAuthenticator),
		new DeleteProduct(productRepo, sessionAuthenticator),
		new ListProducts(productDao, sessionAuthenticator),
	);

	new AuthRestController(
		restApi,
		authenticateUser,
		getAuthenticatedUser,
		SESSION_COOKIE_NAME,
		new Logout(sessionRepo, sessionTokenHasher, dateProvider),
		new BunTokenGenerator(),
	);
	restApi.register(HttpMethod.GET, "/health", async (_, res) => res.text("OK"));

	new ProductResolverRestController(restApi, new ResolveProduct(productDao));
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

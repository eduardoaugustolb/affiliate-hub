import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "bun:test";
import type { SessionRepository } from "@/application/repositories/SessionRepository";
import type { UserRepository } from "@/application/repositories/UserRepository";
import { Session } from "@/domain/entities/Session";
import { User } from "@/domain/entities/User";
import { BunUUIDIdGenerator } from "@/external/BunUUIDIdGenerator";
import { BunSQLAdapter } from "@/external/database/BunSQLAdapter";
import { SessionDAOSQL } from "@/external/database/DAOs/SessionDAOSQL";
import { UserDAOSQL } from "@/external/database/DAOs/UserDAOSQL";
import { BunPasswordHasher } from "@/external/hash/BunPasswordHasher";
import { BunSessionTokenHasher } from "@/external/hash/BunSessionTokenHasher";
import { FetchHttpClientAdapter } from "@/external/http/FetchHttpClientAdapter";
import { RuntimeDateProvider } from "@/external/RuntimeDateProvider";
import { SessionRepositoryDatabase } from "@/infra/database/repositories/SessionRepositoryDatabase";
import { UserRepositoryDatabase } from "@/infra/database/repositories/UserRepositoryDatabase";
import type { HttpClient } from "@/infra/http/HttpClient";

// Run against a running API connected to the same migrated test database:
// TEST_DATABASE_URL=... TEST_API_URL=http://localhost:3000 bun test test/api/auth.test.ts
// Contract for TDD: POST /auth/login sets the configured session cookie; GET /auth/me reads the cookie.
// The HTTP adapter sends Cookie explicitly here; browser cookie policy requires separate browser verification.
const { TEST_DATABASE_URL, TEST_API_URL } = process.env;
const cookieName =
	process.env.SESSION_COOKIE_NAME ??
	(process.env.NODE_ENV === "production" ? "__Host-session" : "session");

describe.skipIf(!TEST_DATABASE_URL || !TEST_API_URL)(
	"Authentication API",
	() => {
		let database: BunSQLAdapter;
		let userId: string;
		let userRepo: UserRepository;
		let sessionRepo: SessionRepository;
		const dateProvider = new RuntimeDateProvider();
		let email: string;
		let passwordHash: string;
		const password = "Test-password-123!";
		const tokenHasher = new BunSessionTokenHasher();
		const httpClient: HttpClient = new FetchHttpClientAdapter();

		function url(path: string) {
			return new URL(path, TEST_API_URL).toString();
		}

		function login(body: unknown = { email, password }) {
			return httpClient.post(url("/auth/login"), body, { timeoutMs: 5000 });
		}

		function me(token?: string) {
			return httpClient.get(url("/auth/me"), {
				headers:
					token === undefined ? {} : { Cookie: `${cookieName}=${token}` },
				timeoutMs: 5000,
			});
		}

		function sessionToken(response: HttpClient.Response): string {
			const cookies = response.cookies.filter((cookie) =>
				cookie.startsWith(`${cookieName}=`),
			);
			expect(cookies).toHaveLength(1);
			const cookie = cookies[0];
			if (!cookie) throw new Error("Missing __Host-session cookie");
			const [pair, ...attributes] = cookie
				.split(";")
				.map((part) => part.trim());
			const normalized = attributes.map((attribute) => attribute.toLowerCase());
			if (cookieName.startsWith("__Host-"))
				expect(normalized).toContain("secure");
			else expect(normalized).not.toContain("secure");
			expect(normalized).toContain("httponly");
			expect(normalized).toContain("path=/");
			expect(normalized).toContain("samesite=strict");
			expect(
				normalized.some((attribute) => attribute.startsWith("domain=")),
			).toBe(false);
			const token = pair?.slice(`${cookieName}=`.length);
			if (!token) throw new Error("Empty __Host-session cookie");
			return token;
		}

		async function expectUnauthorized(response: HttpClient.Response) {
			expect(response.statusCode).toBe(401);
			expect(response.body).toMatchObject({
				code: "INVALID_CREDENTIALS",
			});
		}

		beforeAll(async () => {
			if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required");
			database = new BunSQLAdapter({ dbUrl: TEST_DATABASE_URL });
			const idGenerator = new BunUUIDIdGenerator();
			userRepo = new UserRepositoryDatabase(
				new UserDAOSQL(database),
				idGenerator,
			);
			sessionRepo = new SessionRepositoryDatabase(
				new SessionDAOSQL(database),
				idGenerator,
				dateProvider,
			);
			passwordHash = await new BunPasswordHasher().hash(password);
		});

		beforeEach(async () => {
			email = `auth-${crypto.randomUUID()}@example.com`;
			await userRepo.save(
				User.create("Auth Test", email, passwordHash, "admin"),
			);
			const user = await userRepo.findByEmail(email);
			if (!user) throw new Error("Test user was not persisted");
			userId = user.getId();
		});

		afterEach(async () => {
			// The users foreign key cascades deletion to this user's sessions.
			if (userId) await userRepo.deleteById(userId);
		});

		afterAll(async () => {
			await database?.close();
		});

		describe("POST /auth/login", () => {
			it("authenticates valid credentials and persists only the token hash", async () => {
				const response = await login();
				expect(response.statusCode).toBe(200);
				const token = sessionToken(response);
				const body = JSON.stringify(response.body) ?? "";
				expect(body).not.toContain(token);
				expect(body).not.toContain('"token"');
				expect(response.headers.authorization).toBeUndefined();
				const session = await sessionRepo.findByTokenHash(
					await tokenHasher.hash(token),
				);
				expect(session).not.toBeNull();
				expect(session?.getUserId()).toBe(userId);
				expect(session?.getTokenHash()).not.toBe(token);
				expect(session?.getExpiresAt().getTime()).toBeGreaterThan(Date.now());
				expect(session?.getRevokedAt()).toBeNull();
			});

			it.each(["password", "email"] as const)(
				"rejects an invalid %s",
				async (invalid) => {
					await expectUnauthorized(
						await login({
							email:
								invalid === "email" ? `missing-${userId}@example.com` : email,
							password: invalid === "password" ? "wrong-password" : password,
						}),
					);
				},
			);

			it.each([
				{},
				{ email: "invalid", password },
				{ password },
				{ email: "test@example.com" },
				{ email: 123, password },
				{ email: "test@example.com", password: "" },
			])("rejects malformed login input: %j", async (body) => {
				const response = await login(body);
				expect(response.statusCode).toBe(400);
			});
		});

		describe("GET /auth/me", () => {
			it("returns the authenticated user without exposing password or session data", async () => {
				const response = await login();
				expect(response.statusCode).toBe(200);
				const token = sessionToken(response);
				const profile = await me(token);
				expect(profile.statusCode).toBe(200);
				expect(profile.body).toEqual({
					id: userId,
					name: "Auth Test",
					email,
					role: "admin",
				});
			});

			it("rejects a request without a session cookie", async () => {
				await expectUnauthorized(await me());
			});

			it("rejects an unknown session cookie", async () => {
				await expectUnauthorized(await me("unknown-session-token"));
			});

			it("does not accept the session token through a Bearer header", async () => {
				const response = await login();
				expect(response.statusCode).toBe(200);
				const token = sessionToken(response);
				await expectUnauthorized(
					await httpClient.get(url("/auth/me"), {
						headers: { Authorization: `Bearer ${token}` },
					}),
				);
			});

			it("rejects an empty session cookie", async () => {
				await expectUnauthorized(await me(""));
			});

			it.each(["expired", "revoked"] as const)(
				"rejects a %s session",
				async (state) => {
					const token = crypto.randomUUID();
					const now = dateProvider.now();
					const historicalClock = {
						now: () => new Date(now.getTime() - 172_800_000),
						add: (ms: number) => new Date(now.getTime() - 172_800_000 + ms),
					};
					const session =
						state === "expired"
							? Session.create(
									new Date(now.getTime() - 86_400_000),
									userId,
									await tokenHasher.hash(token),
									historicalClock,
								)
							: Session.rehydrate(
									crypto.randomUUID(),
									dateProvider.add(86_400_000),
									now,
									userId,
									await tokenHasher.hash(token),
									dateProvider,
								);
					await sessionRepo.save(session);
					await expectUnauthorized(await me(token));
				},
			);
		});
	},
);

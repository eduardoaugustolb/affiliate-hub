import type { Knex } from "knex";

process.loadEnvFile("./.env");
export default {
	client: "pg",
	connection: String(process.env.DATABASE_URL),
	migrations: {
		directory: "./src/external/database/migrations",
	},
} satisfies Knex.Config;

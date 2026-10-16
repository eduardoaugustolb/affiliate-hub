import type { Knex } from "knex";

export default {
	client: "pg",
	connection: String(process.env.DATABASE_URL),
	migrations: {
		directory: "./src/external/database/migrations",
	},
} satisfies Knex.Config;

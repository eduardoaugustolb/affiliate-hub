import knex from "knex";
import config from "../knexfile";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const database = knex(config);
try {
	const [batch, migrations] = await database.migrate.latest();
	console.log(`Migration batch ${batch}: ${migrations.length} applied`);
} finally {
	await database.destroy();
}

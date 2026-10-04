import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
	await knex.schema.createTable("sessions", (table) => {
		table.string("id", 36).primary();
		table
			.string("user_id", 36)
			.notNullable()
			.references("users.id")
			.onDelete("CASCADE");
		table.string("token_hash", 64).notNullable().unique();
		table
			.timestamp("created_at", { useTz: true })
			.notNullable()
			.defaultTo(knex.fn.now());
		table.timestamp("expires_at", { useTz: true }).notNullable();
		table.timestamp("revoked_at", { useTz: true }).nullable();
		table
			.timestamp("updated_at", { useTz: true })
			.notNullable()
			.defaultTo(knex.fn.now());
		table.index(["user_id"]);
	});
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.dropTableIfExists("sessions");
}

import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
	await knex.schema.createTable("users", (table) => {
		table.string("id", 36).primary();
		table.string("name").notNullable();
		table.string("email").notNullable().unique();
		table.string("password_hash").notNullable();
		table.string("role").notNullable();
		table
			.timestamp("created_at", { useTz: true })
			.notNullable()
			.defaultTo(knex.fn.now());
		table
			.timestamp("updated_at", { useTz: true })
			.notNullable()
			.defaultTo(knex.fn.now());
	});
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.dropTableIfExists("users");
}

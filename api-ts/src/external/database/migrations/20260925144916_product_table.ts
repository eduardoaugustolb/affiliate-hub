import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
	await knex.schema.createTable("products", (t) => {
		t.string("id").primary();
		t.string("code", 6).unique().notNullable();
		t.string("destination_url").notNullable();
		t.string("marketplace", 20).notNullable().checkIn(["shopee", "shein"]);
		t.string("image_url").notNullable();
		t.string("status", 20).notNullable().checkIn(["active", "inactive"]);
		t.timestamp("updated_at", {
			precision: 1,
			useTz: true,
		}).notNullable();
		t.timestamp("created_at", {
			precision: 1,
			useTz: true,
		}).notNullable();

		t.index(["status", "created_at"], "products_status_created_at_idx");
	});
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.dropTable("products");
}

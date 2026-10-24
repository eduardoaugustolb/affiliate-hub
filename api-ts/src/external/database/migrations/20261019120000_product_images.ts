import type { Knex } from "knex";
export async function up(knex: Knex): Promise<void> {
	await knex.raw("ALTER TABLE products ADD COLUMN image_urls jsonb");
	await knex.raw(
		"UPDATE products SET image_urls = jsonb_build_array(image_url)",
	);
	await knex.raw("ALTER TABLE products ALTER COLUMN image_urls SET NOT NULL");
	await knex.raw(
		"ALTER TABLE products ADD CONSTRAINT products_image_urls_check CHECK (jsonb_typeof(image_urls) = 'array' AND jsonb_array_length(image_urls) BETWEEN 1 AND 20 AND image_urls->>0 = image_url)",
	);
}
export async function down(knex: Knex): Promise<void> {
	await knex.schema.alterTable("products", (t) => t.dropColumn("image_urls"));
}

import type { Knex } from "knex";
export async function up(knex: Knex): Promise<void> {
	await knex.raw(`
 CREATE TABLE filter_categories (id varchar(10) PRIMARY KEY CHECK (id IN ('size', 'color')), name varchar(160) NOT NULL CHECK (length(trim(name)) > 0));
 CREATE UNIQUE INDEX filter_categories_name_unique ON filter_categories (lower(name));
 INSERT INTO filter_categories (id, name) VALUES ('size', 'Tamanho'), ('color', 'Cor');
 CREATE TABLE filter_options (id uuid PRIMARY KEY, category_id varchar(10) NOT NULL REFERENCES filter_categories(id) ON DELETE CASCADE, name varchar(160) NOT NULL CHECK (length(trim(name)) > 0));
 CREATE UNIQUE INDEX filter_options_name_unique ON filter_options (category_id, lower(name));
 CREATE TABLE product_filter_options (product_id varchar(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE, option_id uuid NOT NULL REFERENCES filter_options(id) ON DELETE CASCADE, PRIMARY KEY(product_id, option_id));
 CREATE INDEX product_filter_options_option_idx ON product_filter_options(option_id, product_id);
 CREATE TABLE outfits (code varchar(20) PRIMARY KEY, name varchar(160) NOT NULL CHECK (length(trim(name)) > 0));
 CREATE TABLE outfit_products (outfit_code varchar(20) NOT NULL REFERENCES outfits(code) ON DELETE CASCADE, product_id varchar(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE, PRIMARY KEY(outfit_code, product_id));
 CREATE INDEX outfit_products_product_idx ON outfit_products(product_id);
 `);
}
export async function down(knex: Knex): Promise<void> {
	await knex.raw(
		"DROP TABLE outfit_products, outfits, product_filter_options, filter_options, filter_categories",
	);
}

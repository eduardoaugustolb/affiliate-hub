import type { Knex } from "knex";
export async function up(knex: Knex): Promise<void> {
	await knex.schema.alterTable("products", (t) => {
		t.string("name", 160).notNullable().defaultTo("Produto");
	});
	await knex.raw("UPDATE products SET name = 'Produto ' || code");
	await knex.schema.createTable("reserved_product_codes", (t) => {
		t.string("code", 6).primary();
	});
	await knex.raw(
		"INSERT INTO reserved_product_codes (code) SELECT UPPER(TRIM(code)) FROM products",
	);
	await knex.raw(`CREATE FUNCTION reserve_product_code() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN
  IF TG_OP = 'UPDATE' THEN
   IF NEW.code IS DISTINCT FROM OLD.code THEN RAISE EXCEPTION 'Product code is permanent'; END IF;
   RETURN NEW;
  END IF;
  NEW.code := UPPER(TRIM(NEW.code));
  IF NEW.code !~ '^[A-HJ-NP-Z2-9]{4,6}$' THEN RAISE EXCEPTION 'Invalid product code' USING ERRCODE = '23514'; END IF;
  BEGIN
   INSERT INTO reserved_product_codes (code) VALUES (NEW.code);
  EXCEPTION WHEN unique_violation THEN
   RAISE EXCEPTION 'Product code is already reserved' USING ERRCODE = '23505', CONSTRAINT = 'products_code_unique';
  END;
  RETURN NEW;
 END $$`);
	await knex.raw(
		"CREATE TRIGGER products_reserve_code BEFORE INSERT OR UPDATE OF code ON products FOR EACH ROW EXECUTE FUNCTION reserve_product_code()",
	);
}
export async function down(knex: Knex): Promise<void> {
	await knex.raw("DROP TRIGGER products_reserve_code ON products");
	await knex.raw("DROP FUNCTION reserve_product_code()");
	await knex.schema.dropTable("reserved_product_codes");
	await knex.schema.alterTable("products", (t) => t.dropColumn("name"));
}

import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('affiliate_product_imports', (table) => {
    table.string('external_product_id').primary()
    table.string('product_id').notNullable().unique().references('id').inTable('products')
    table.timestamp('imported_at', { useTz: true }).notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('affiliate_product_imports')
}

import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('click_logs', (table) => {
    table.increments('id').primary()
    table.string('product_id').notNullable()
    table.timestamp('clicked_at').notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('click_logs')
}

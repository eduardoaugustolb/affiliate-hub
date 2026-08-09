import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('click_logs', (table) => {
    table.timestamp('clicked_at', { useTz: true }).notNullable().alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('click_logs', (table) => {
    table.timestamp('clicked_at', { useTz: false }).notNullable().alter()
  })
}

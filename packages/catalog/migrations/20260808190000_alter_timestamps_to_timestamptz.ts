import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('products', (table) => {
    table.timestamp('created_at', { useTz: true }).notNullable().alter()
    table.timestamp('updated_at', { useTz: true }).notNullable().alter()
    table.timestamp('removed_at', { useTz: true }).nullable().alter()
  })

  await knex.schema.alterTable('outbox_events', (table) => {
    table.timestamp('occurred_at', { useTz: true }).notNullable().alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('outbox_events', (table) => {
    table.timestamp('occurred_at', { useTz: false }).notNullable().alter()
  })

  await knex.schema.alterTable('products', (table) => {
    table.timestamp('created_at', { useTz: false }).notNullable().alter()
    table.timestamp('updated_at', { useTz: false }).notNullable().alter()
    table.timestamp('removed_at', { useTz: false }).nullable().alter()
  })
}

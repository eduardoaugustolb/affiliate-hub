import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('outbox_events', (table) => {
    table.uuid('lock_token').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('outbox_events', (table) => {
    table.dropColumn('lock_token')
  })
}

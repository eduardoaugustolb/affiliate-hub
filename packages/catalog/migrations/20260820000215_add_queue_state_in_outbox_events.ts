import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('outbox_events', (table) => {
    table.timestamp('enqueued_at', { useTz: true }).nullable()
    table.text('last_enqueue_error').nullable()
    table.integer('enqueue_attempts').notNullable().defaultTo(0)
    table.index(['processed_at', 'enqueued_at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('outbox_events', (table) => {
    table.dropIndex(['processed_at', 'enqueued_at'])
    table.dropColumn('enqueued_at')
    table.dropColumn('last_enqueue_error')
    table.dropColumn('enqueue_attempts')
  })
}

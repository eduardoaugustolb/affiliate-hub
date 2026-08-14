import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('outbox_events', (table) => {
    table.string('event_id').nullable()
    table.timestamp('processed_at', { useTz: true }).nullable()
    table.integer('attempts').notNullable().defaultTo(0)
    table.timestamp('available_at', { useTz: true }).nullable()
    table.timestamp('locked_until', { useTz: true }).nullable()
    table.text('last_error').nullable()
  })
  await knex.raw(
    "update outbox_events set event_id = concat('legacy-', id), available_at = occurred_at where event_id is null",
  )
  await knex.schema.alterTable('outbox_events', (table) => {
    table.string('event_id').notNullable().alter()
    table.timestamp('available_at', { useTz: true }).notNullable().alter()
    table.unique(['event_id'])
    table.index(['processed_at', 'available_at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('outbox_events', (table) => {
    table.dropIndex(['processed_at', 'available_at'])
    table.dropUnique(['event_id'])
    table.dropColumns(
      'last_error',
      'locked_until',
      'available_at',
      'attempts',
      'processed_at',
      'event_id',
    )
  })
}

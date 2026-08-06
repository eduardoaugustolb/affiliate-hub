import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('products', (table) => {
    table.string('id').primary()
    table.string('name').notNullable()
    table.string('category').notNullable()
    table.string('status').notNullable()
    table.string('media_type').nullable()
    table.string('assigned_template').nullable()
    table.jsonb('photos').notNullable().defaultTo('[]')
    table.string('affiliate_link_url').nullable()
    table.timestamp('created_at').notNullable()
    table.timestamp('updated_at').notNullable()
    table.timestamp('removed_at').nullable()
  })

  await knex.schema.createTable('outbox_events', (table) => {
    table.increments('id').primary()
    table.string('name').notNullable()
    table.jsonb('payload').notNullable()
    table.timestamp('occurred_at').notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('outbox_events')
  await knex.schema.dropTable('products')
}

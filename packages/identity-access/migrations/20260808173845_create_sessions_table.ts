import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sessions', (table) => {
    table.string('id').primary()
    table.string('token_hash').notNullable()
    table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.index('user_id')
    table.timestamp('expires_at', { useTz: true }).notNullable()
    table.timestamp('created_at', { useTz: true }).notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('sessions')
}

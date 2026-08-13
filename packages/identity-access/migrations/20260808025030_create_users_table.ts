import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.string('id').primary()
    table.string('email_encrypted').notNullable()
    table.string('email_lookup_hash').notNullable().unique()
    table.string('email_iv').notNullable()
    table.string('email_auth_tag').notNullable()
    table.string('name').notNullable()
    table.string('password_hash').notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users')
}

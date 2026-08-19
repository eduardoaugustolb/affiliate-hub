import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('affiliate_product_imports', (table) => {
    table.string('provider').nullable()
  })

  await knex('affiliate_product_imports').whereNull('provider').update({ provider: 'shopee' })

  await knex.schema.alterTable('affiliate_product_imports', (table) => {
    table.string('provider').notNullable().alter()
    table.dropPrimary()
    table.primary(['provider', 'external_product_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  const externalProductIdCollisions = await knex('affiliate_product_imports')
    .select('external_product_id')
    .groupBy('external_product_id')
    .havingRaw('count(*) > 1')
  const nonShopeeProviders = await knex('affiliate_product_imports')
    .whereNot('provider', 'shopee')
    .first('provider')

  if (externalProductIdCollisions.length > 0 || nonShopeeProviders) {
    throw new Error('Cannot revert provider migration: affiliate product identities would be lost')
  }

  await knex.schema.alterTable('affiliate_product_imports', (table) => {
    table.dropPrimary()
    table.dropColumn('provider')
    table.primary(['external_product_id'])
  })
}

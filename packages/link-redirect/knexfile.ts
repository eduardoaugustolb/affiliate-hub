import type { Knex } from 'knex'

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: './migrations',
    extension: 'ts',
    tableName: 'link_redirect_migrations',
  },
}

export default config

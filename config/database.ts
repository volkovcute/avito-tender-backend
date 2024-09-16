import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('POSTGRES_HOST'),
        port: env.get('POSTGRES_PORT'),
        user: env.get('POSTGRES_USERNAME'),
        password: env.get('POSTGRES_PASSWORD'),
        database: env.get('POSTGRES_DATABASE'),
        ssl: {
          rejectUnauthorized: false
        },
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig

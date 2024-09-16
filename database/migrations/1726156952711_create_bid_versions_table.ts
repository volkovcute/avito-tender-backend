import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bid_versions'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (!exists) {
      this.schema.createTable(this.tableName, (table) => {
        table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
        table.uuid('bid_id').references('id').inTable('bids').onDelete('CASCADE')
        table.string('name', 100).notNullable()
        table.text('description')
        table.enu('status', ['Created', 'Published', 'Canceled'], {
          useNative: true,
          enumName: 'bids_archive_status_type',
        })
        table.enu('authorType', ['Organization', 'User'], {
          useNative: true,
          enumName: 'bids_archive_author_type',
        })
        table.uuid('authorId').notNullable()
        table.integer('version').notNullable() // Сохраняем номер версии
        table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
        table.timestamp('archived_at', { useTz: true }).defaultTo(this.now())
      })
    }
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw(`DROP TYPE bids_archive_status_type`)
    this.schema.raw(`DROP TYPE bids_archive_author_type`)
  }
}

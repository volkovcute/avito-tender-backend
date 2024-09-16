import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bids'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (!exists) {
      this.schema.createTable(this.tableName, (table) => {
        table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
        table.string('name', 100).notNullable()
        table.text('description')
        table.uuid('tender_id').references('id').inTable('tenders').notNullable()
        table
          .enu('status', ['Created', 'Published', 'Canceled'], {
            useNative: true,
            enumName: 'bids_status_type',
          })
          .notNullable()
        table
          .enu('authorType', ['Organization', 'User'], {
            useNative: true,
            enumName: 'bids_author_type',
          })
          .notNullable()
        table.uuid('authorId').notNullable()
        table.integer('version').defaultTo(1).notNullable()
        table.uuid('created_by').notNullable()
        table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      })
    }
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw(`DROP TYPE bids_status_type`)
    this.schema.raw(`DROP TYPE bids_author_type`)
  }
}

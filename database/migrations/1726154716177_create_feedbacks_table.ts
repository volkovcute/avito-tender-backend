import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'feedbacks'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (!exists) {
      this.schema.createTable(this.tableName, (table) => {
        table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
        table.uuid('bid_id').references('id').inTable('bids').notNullable()
        table.text('feedback').notNullable()
        table.uuid('created_by').references('id').inTable('employee').notNullable()
        table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      })
    }
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

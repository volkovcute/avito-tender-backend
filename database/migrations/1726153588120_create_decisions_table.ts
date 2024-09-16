import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'decisions'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (!exists) {
      this.schema.createTable(this.tableName, (table) => {
        table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
        table.uuid('bid_id').references('id').inTable('bids').notNullable()
        table
          .enu('decision', ['Approved', 'Rejected'], {
            useNative: true,
            enumName: 'decision_status_type',
          })
          .notNullable()
        table.uuid('created_by').references('id').inTable('employee').notNullable()
      })
    }
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw(`DROP TYPE decision_status_type`)
  }
}

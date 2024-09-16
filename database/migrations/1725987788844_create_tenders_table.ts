import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tenders'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (!exists) {
      this.schema.createTable(this.tableName, (table) => {
        table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
        table.string('name', 100).notNullable()
        table.text('description')
        table.enu('status', ['Created', 'Published', 'Closed'], {
          useNative: true,
          enumName: 'tenders_status_type',
        })
        table.enu('serviceType', ['Construction', 'Delivery', 'Manufacture'], {
          useNative: true,
          enumName: 'tenders_service_type',
        })
        table.integer('version').defaultTo(1)
        table.uuid('created_by').references('id').inTable('employee')
        table.uuid('organization').references('id').inTable('organization')
        table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      })
    }
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw(`DROP TYPE tenders_status_type`)
    this.schema.raw(`DROP TYPE tenders_service_type`)
  }
}

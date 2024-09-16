import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tender_versions'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (!exists) {
      this.schema.createTable(this.tableName, (table) => {
        table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
        table.uuid('tender_id').references('id').inTable('tenders').onDelete('CASCADE')
        table.string('name', 100).notNullable()
        table.text('description')
        table.enu('status', ['Created', 'Published', 'Closed'], {
          useNative: true,
          enumName: 'tender_versions_status_type',
        })
        table.enu('serviceType', ['Construction', 'Delivery', 'Manufacture'], {
          useNative: true,
          enumName: 'tender_versions_service_type',
        })
        table.integer('version')
        table.uuid('created_by').references('id').inTable('employee')
        table.uuid('organization').references('id').inTable('organization')
        table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
        table.timestamp('archived_at', { useTz: true }).defaultTo(this.now()) // Момент архивации версии
      })
    }
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw(`DROP TYPE tender_versions_status_type`)
    this.schema.raw(`DROP TYPE tender_versions_service_type`)
  }
}

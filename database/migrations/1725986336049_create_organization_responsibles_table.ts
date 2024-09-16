import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organization_responsibles'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (!exists) {
      this.schema.createTable(this.tableName, (table) => {
        table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
        table.uuid('organization_id').references('id').inTable('organization').onDelete('CASCADE')
        table.uuid('user_id').references('id').inTable('employee').onDelete('CASCADE')
      })
    }
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

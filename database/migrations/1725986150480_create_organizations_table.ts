import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organization'

  async up() {
    const exists = await this.schema.hasTable(this.tableName)
    if (!exists) {
      this.schema.createTable(this.tableName, (table) => {
        table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'))
        table.string('name', 100).notNullable()
        table.text('description')
        table.enu('type', ['IE', 'LLC', 'JSC'], { useNative: true, enumName: 'organization_type' })
        table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
        table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
      })
    }
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw(`DROP TYPE organization_type`)
  }
}

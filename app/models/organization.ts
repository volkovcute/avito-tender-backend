import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Organization extends BaseModel {
  static table = 'organization'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare description?: string

  @column()
  declare type: 'IE' | 'LLC' | 'JSC'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

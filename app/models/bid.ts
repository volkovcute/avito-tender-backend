import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class Bid extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare description?: string

  @column({ columnName: 'tender_id' })
  declare tenderId: string

  @column()
  declare status: 'Created' | 'Published' | 'Canceled'

  @column({ columnName: 'authorType' })
  declare authorType: 'Organization' | 'User'

  @column({ columnName: 'authorId' })
  declare authorId: string

  @column()
  declare version: number

  @column({ columnName: 'created_by' })
  declare createdBy: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}

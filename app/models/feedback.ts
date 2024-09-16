import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Feedback extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'bid_id' })
  declare bidId: string

  @column({ columnName: 'feedback' })
  declare feedback: string

  @column({ columnName: 'created_by' })
  declare createdBy: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}

import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Decision extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'bid_id' })
  declare bidId: string

  @column({ columnName: 'decision' })
  declare decision: string

  @column({ columnName: 'created_by' })
  declare createdBy: string
}

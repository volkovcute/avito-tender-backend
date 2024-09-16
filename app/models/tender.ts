import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Tender extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare description?: string

  @column()
  declare status: 'Created' | 'Published' | 'Closed'

  @column({ columnName: 'serviceType' })
  declare serviceType: 'Construction' | 'Delivery' | 'Manufacture'

  @column()
  declare version: number

  @column({ columnName: 'created_by' })
  declare createdBy: string
  
  @column({ columnName: 'organization' })
  declare organization: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}

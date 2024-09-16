import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class OrganizationResponsible extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organizationId: string

  @column()
  declare userId: string
}

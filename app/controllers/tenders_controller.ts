import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { createTenderValidator, editTenderValidator } from '#validators/tender'
import Employee from '#models/employee'
import Tender from '#models/tender'
import Organization from '#models/organization'
import OrganizationResponsible from '#models/organization_responsible'

async function archiveTenderVersion(tender: Tender) {
  try {
    await db.table('tender_versions').insert({
      tender_id: tender.id,
      name: tender.name,
      description: tender.description,
      status: tender.status,
      serviceType: tender.serviceType,
      version: tender.version,
      created_by: tender.createdBy,
      organization: tender.organization,
    })
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

async function rollbackTender(tenderId: string, version: number) {
  try {
    const tenderVersion = await db
      .from('tender_versions')
      .where('tender_id', tenderId)
      .andWhere('version', version)
      .first()

    if (!tenderVersion) {
      return null
    }

    const tender = await db.from('tenders').where('id', tenderId).first()

    await archiveTenderVersion(tender)
    const newVersion = tender.version + 1

    await db.from('tenders').where('id', tenderId).update({
      name: tenderVersion.name,
      description: tenderVersion.description,
      status: tenderVersion.status,
      serviceType: tenderVersion.serviceType,
      version: newVersion,
    })
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export default class TendersController {
  async index({ request, response }: HttpContext) {
    try {
      const limit = request.input('limit', 5)
      const offset = request.input('offset', 0)
      const serviceType = request.input('service_type', [])

      const query = db.from('tenders').limit(limit).offset(offset)

      if (serviceType.length > 0) {
        query.whereIn('serviceType', serviceType)
      }

      const tenders = await query
      return response.status(200).json(tenders)
    } catch (error) {
      console.error(error)
      return response.badRequest({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const data = request.all()
      const payload = await createTenderValidator.validate(data)

      const user = await Employee.findBy('username', payload.creatorUsername)
      if (!user) {
        return response.status(401).json({ reason: 'Пользователь не найден.' })
      }

      const organization = await Organization.findBy('id', payload.organizationId)
      if (!organization) {
        return response.status(404).json({ reason: 'Организация не найдена.' })
      }

      const isResponsible = await OrganizationResponsible.query()
        .where('user_id', user.id)
        .where('organization_id', organization.id)
        .first()

      if (!isResponsible) {
        return response.status(403).json({ reason: 'Недостаточно прав для выполнения действия.' })
      }

      const tender = await Tender.create({
        name: payload.name,
        description: payload.description,
        status: 'Created',
        serviceType: payload.serviceType,
        version: 1,
        createdBy: user.id,
        organization: organization.id,
      })

      await archiveTenderVersion(tender)

      const tenderJson = tender.toJSON()
      return response.status(200).json({
        id: tenderJson.id,
        name: tenderJson.name,
        description: tenderJson.description,
        status: tenderJson.status,
        serviceType: tenderJson.serviceType,
        version: tenderJson.version,
        createdAt: tenderJson.createdAt,
      })
    } catch (error) {
      console.error(error)
      if (error.code === 'E_VALIDATION_ERROR') {
        return response.badRequest({
          reason: `Ошибка валидации: ${error.messages
            .map((i: { message: string; rule: string; field: string }) => `${i.field}`)
            .join(', ')}`,
        })
      }
      return response.badRequest({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async userTenders({ request, response }: HttpContext) {
    try {
      const limit = request.input('limit', 100)
      const offset = request.input('offset', 0)
      const username = request.input('username', '')

      if (!username) {
        return response.badRequest({ reason: 'Отсутствуют необходимые параметры.' })
      }
      
      const user = await Employee.findBy('username', username)
      if (!user) {
        return response.status(401).json({ reason: 'Пользователь не найден.' })
      }

      if (offset < 0 || limit < 0) {
        return response.badRequest({ reason: 'Ошибка валидации параметров.' })
      }

      const tenders = await db
        .from('tenders')
        .select('id', 'name', 'description', 'status', 'serviceType', 'version', 'created_at')
        .where('created_by', user.id)
        .orderBy('name', 'asc')
        .limit(limit)
        .offset(offset)

      const updatedTenders = tenders.map((tender) => ({
        ...tender,
        createdAt: tender.created_at,
        created_at: undefined,
      }))

      return response.status(200).json(updatedTenders)
    } catch (error) {
      console.error(error)
      return response.badRequest({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async tenderStatus({ request, response }: HttpContext) {
    try {
      const { id } = request.params()
      const username = request.input('username', '')

      if (!username) {
        return response.badRequest({ reason: 'Отсутствуют необходимые параметры.' })
      }

      const user = await Employee.findBy('username', username)
      if (!user) {
        return response.status(401).json({ reason: 'Пользователь не найден.' })
      }

      const tender = await Tender.findBy('id', id)
      if (!tender) {
        return response.status(404).json({ reason: 'Тендер не найден.' })
      }

      if (tender.status === 'Published') {
        return tender.status
      } else if (
        (tender.status === 'Created' || tender.status === 'Closed') &&
        user.id === tender.createdBy
      ) {
        return tender.status
      }
      return response.forbidden({ reason: 'Недостаточно прав для выполнения действия.' })
    } catch (error) {
      console.error(error)
      return response.badRequest({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async editTenderStatus({ request, response }: HttpContext) {
    try {
      const { id } = request.params()
      const username = request.input('username', '')
      const status = request.input('status', '')

      if (!username || !status) {
        return response.badRequest({ reason: 'Отсутствуют необходимые параметры.' })
      }

      const user = await Employee.findBy('username', username)
      if (!user) {
        return response.status(401).json({ reason: 'Пользователь не существует или некорректен.' })
      }

      const tender = await Tender.findBy('id', id)
      if (!tender) {
        return response.status(404).json({ reason: 'Тендер не найден.' })
      }

      const organization = await Organization.findBy('id', tender.organization)
      if (!organization) {
        return response.status(404).json({ reason: 'Организация не найдена.' })
      }

      const isResponsible = await OrganizationResponsible.query()
        .where('user_id', user.id)
        .where('organization_id', organization.id)
        .first()

      if (!isResponsible) {
        return response.status(403).json({ reason: 'Недостаточно прав для выполнения действия.' })
      }

      if (!['Created', 'Published', 'Closed'].includes(status)) {
        return response.badRequest({
          reason: 'Неверный формат запроса или его параметры.',
        })
      }

      tender.merge({ status })
      await tender.save()

      const tenderJSON = tender.toJSON()
      return response.status(200).json({
        id: tenderJSON.id,
        name: tenderJSON.name,
        description: tenderJSON.description,
        status: tenderJSON.status,
        serviceType: tenderJSON.serviceType,
        version: tenderJSON.version,
        createdAt: tenderJSON.createdAt,
      })
    } catch (error) {
      console.error(error)
      return response.badRequest({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async editTender({ request, response }: HttpContext) {
    try {
      const { id } = request.params()
      const username = request.input('username', '')

      const data = request.all()
      const { name, description, serviceType } = await editTenderValidator.validate(data)

      if (!username) {
        return response.badRequest({ reason: 'Отсутствуют необходимые параметры.' })
      }

      const user = await Employee.findBy('username', username)
      if (!user) {
        return response.status(401).json({ reason: 'Пользователь не существует или некорректен.' })
      }

      const tender = await Tender.findBy('id', id)
      if (!tender) {
        return response.status(404).json({ reason: 'Тендер не найден.' })
      }

      const organization = await Organization.findBy('id', tender.organization)
      if (!organization) {
        return response.status(404).json({ reason: 'Организация не найдена.' })
      }

      const isResponsible = await OrganizationResponsible.query()
        .where('user_id', user.id)
        .where('organization_id', organization.id)
        .first()

      if (!isResponsible) {
        return response.status(403).json({ reason: 'Недостаточно прав для выполнения действия.' })
      }

      tender.merge({
        name: !name ? tender.name : name,
        description: !description ? tender.description : description,
        serviceType: !serviceType ? tender.serviceType : serviceType,
        version: tender.version + 1,
      })

      await tender.save()

      const archiveSuccess = await archiveTenderVersion(tender)
      if (!archiveSuccess) {
        return response.status(500).json({ reason: 'Не удалось заархивировать версию.' })
      }

      return response.status(200).json({
        id: tender.id,
        name: tender.name,
        description: tender.description,
        status: tender.status,
        serviceType: tender.serviceType,
        version: tender.version,
        createdAt: tender.createdAt,
      })
    } catch (error) {
      console.error(error)
      if (error.code === 'E_VALIDATION_ERROR') {
        return response.badRequest({
          reason: `Ошибка валидации: ${error.messages
            .map((i: { message: string; rule: string; field: string }) => `${i.field}`)
            .join(', ')}`,
        })
      }
      return response.badRequest({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async rollbackTender({ request, response }: HttpContext) {
    try {
      const { id, version } = request.params()
      const username = request.input('username', '')

      if (!username) {
        return response.badRequest({ reason: 'Отсутствуют необходимые параметры.' })
      }

      const user = await Employee.findBy('username', username)
      if (!user) {
        return response.status(401).json({ reason: 'Пользователь не существует или некорректен.' })
      }

      const tender = await Tender.findBy('id', id)
      if (!tender) {
        return response.status(404).json({ reason: 'Тендер не найден.' })
      }

      const organization = await Organization.findBy('id', tender.organization)
      if (!organization) {
        return response.status(404).json({ reason: 'Организация не найдена.' })
      }

      const isResponsible = await OrganizationResponsible.query()
        .where('user_id', user.id)
        .where('organization_id', organization.id)
        .first()

      if (!isResponsible) {
        return response.status(403).json({ reason: 'Недостаточно прав для выполнения действия.' })
      }

      if (Number(tender.version) === Number(version)) {
        return response.badRequest({ reason: 'Невозможно откатиться к текущей версии' })
      }

      const rollbackSuccess = await rollbackTender(id, version)
      if (!rollbackSuccess) {
        return response.status(404).json({ reason: 'Версия не найдена.' })
      }

      const updatedTender = await Tender.findBy('id', id)
      if (!updatedTender) {
        return response.status(404).json({ reason: 'Тендер не найден.' })
      }

      return response.status(200).json({
        id: updatedTender.id,
        name: updatedTender.name,
        description: updatedTender.description,
        status: updatedTender.status,
        serviceType: updatedTender.serviceType,
        version: updatedTender.version,
        createdAt: updatedTender.createdAt,
      })
    } catch (error) {
      console.error(error)
      return response.badRequest({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }
}

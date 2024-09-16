import type { HttpContext } from '@adonisjs/core/http'
import { createBidValidator, editBidValidator } from '#validators/bid'
import Tender from '#models/tender'
import Employee from '#models/employee'
import Bid from '#models/bid'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import OrganizationResponsible from '#models/organization_responsible'
import Decision from '#models/decision'
import Feedback from '#models/feedback'

async function archiveCurrentBid(bid: Bid) {
  try {
    await db.table('bid_versions').insert({
      bid_id: bid.id,
      name: bid.name,
      description: bid.description,
      status: bid.status,
      authorType: bid.authorType,
      authorId: bid.authorId,
      version: bid.version,
    })
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

async function rollbackBidToVersion(bid: Bid, targetVersion: number) {
  try {
    const previousVersion = await db
      .from('bid_versions')
      .where('bid_id', bid.id)
      .andWhere('version', targetVersion)
      .first()

    if (!previousVersion) {
      return null
    }

    await archiveCurrentBid(bid)
    const newVersion = bid.version + 1

    await db.from('bids').where('id', bid.id).update({
      name: previousVersion.name,
      description: previousVersion.description,
      status: previousVersion.status,
      authorType: previousVersion.authorType,
      authorId: previousVersion.authorId,
      version: newVersion,
    })

    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export default class BidsController {
  async store({ request, response }: HttpContext) {
    try {
      const data = request.all()
      const payload = await createBidValidator.validate(data)

      const tender = await Tender.findBy('id', payload.tenderId)
      if (!tender) {
        return response.status(404).json({ reason: 'Тендер не найден.' })
      }

      const user = await Employee.findBy('id', payload.authorId)
      if (!user) {
        return response.status(401).json({ reason: 'Пользователь не существует или некорректен.' })
      }

      if (user.id === tender.createdBy) {
        return response.status(400).json({ reason: 'Вы не можете откликнуться на свой тендер.' })
      }

      const existingBid = await Bid.query()
        .where('tender_id', tender.id)
        .where('authorId', user.id)
        .first()
      if (existingBid) {
        return response.status(400).json({ reason: 'Вы уже оставили предложение.' })
      }

      const bid = await Bid.create({
        name: payload.name,
        description: payload.description,
        tenderId: payload.tenderId,
        status: 'Created',
        authorType: payload.authorType,
        authorId: payload.authorId,
        createdBy: user.id,
      })

      return response.status(200).json({
        id: bid.id,
        name: bid.name,
        status: bid.status,
        authorType: bid.authorType,
        authorId: bid.authorId,
        version: 1,
        createdAt: bid.createdAt,
      })
    } catch (error) {
      console.error(error)
      if (error.code === 'E_VALIDATION_ERROR') {
        return response.status(400).json({
          reason: `Ошибка валидации: ${error.messages
            .map((i: { message: string; rule: string; field: string }) => `${i.field}`)
            .join(', ')}`,
        })
      }
      return response.status(400).json({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async userBids({ request, response }: HttpContext) {
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

      const bids = await db
        .from('bids')
        .select('id', 'name', 'status', 'authorType', 'authorId', 'version', 'created_at')
        .where('created_by', user.id)
        .orderBy('name', 'asc')
        .limit(limit)
        .offset(offset)

      const updatedBids = bids.map((bid) => ({
        ...bid,
        createdAt: bid.created_at,
        created_at: undefined,
      }))
      return response.status(200).json(updatedBids)
    } catch (error) {
      console.error(error)
      return response.status(400).json({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async updateBidStatus({ request, response }: HttpContext) {
    try {
      const { id } = request.params()
      const username = request.input('username', '')
      const status = request.input('status', '')

      if (!username) {
        return response.status(400).json({ reason: 'Неверный формат запроса или его параметры.' })
      }

      const user = await Employee.findBy('username', username)
      if (!user) {
        return response.status(401).json({
          reason: 'Пользователь не существует или некорректен.',
        })
      }

      const bid = await Bid.findBy('id', id)
      if (!bid) {
        return response.status(404).json({ reason: 'Предложение не найдено.' })
      }

      if (bid.createdBy !== user.id) {
        return response.status(403).json({ reason: 'Недостаточно прав для выполнения действия.' })
      }

      const validStatuses = ['Created', 'Published', 'Canceled']
      if (!validStatuses.includes(status)) {
        return response.status(400).json({ reason: 'Неверный статус предложения.' })
      }

      bid.merge({ status })
      await bid.save()

      return response.status(200).json({
        id: bid.id,
        name: bid.name,
        status: bid.status,
        authorType: bid.authorType,
        authorId: bid.authorId,
        version: bid.version,
        createdAt: bid.createdAt,
      })
    } catch (error) {
      console.error(error)
      return response.status(400).json({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async bidsList({ request, response }: HttpContext) {
    try {
      const { id } = request.params()
      const username = request.input('username', '')
      const limit = request.input('limit', 100)
      const offset = request.input('offset', 0)

      if (!username) {
        return response.status(400).json({ reason: 'Неверный формат запроса или его параметры.' })
      }

      const user = await Employee.findBy('username', username)
      if (!user) {
        return response.status(401).json({ reason: 'Пользователь не найден.' })
      }

      const tender = await Tender.findBy('id', id)
      if (!tender) {
        return response.status(404).json({ reason: 'Тендер не найден.' })
      }

      const organization = await Organization.findBy('id', tender.organization)
      if (!organization) {
        return response.status(404).json({ reason: 'Организация не найдена.' })
      }

      const organizationResponsible = await OrganizationResponsible.query()
        .where('user_id', user.id)
        .where('organization_id', organization.id)
        .first()

      if (!organizationResponsible) {
        return response.status(403).json({ reason: 'Недостаточно прав для выполнения действия.' })
      }

      const bids = await db
        .from('bids')
        .select('id', 'name', 'status', 'authorType', 'authorId', 'version', 'created_at')
        .where('tender_id', id)
        .orderBy('name', 'asc')
        .limit(limit)
        .offset(offset)

      return response.status(200).json(bids)
    } catch (error) {
      console.error(error)
      return response.status(400).json({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async bidStatus({ request, response }: HttpContext) {
    try {
      const { id } = request.params()
      const username = request.input('username', '')

      if (!username) {
        return response.status(400).json({ reason: 'Неверный формат запроса или его параметры.' })
      }

      const user = await Employee.findBy('username', username)
      if (!user) {
        return response.status(401).json({ reason: 'Пользователь не существует или некорректен.' })
      }

      const bid = await Bid.findBy('id', id)
      if (!bid) {
        return response.status(404).json({ reason: 'Предложение не найдено.' })
      }

      if (bid.createdBy !== user.id) {
        return response.status(403).json({ reason: 'Недостаточно прав для выполнения действия.' })
      }

      return bid.status
    } catch (error) {
      console.error(error)
      return response.status(400).json({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async updateBid({ request, response }: HttpContext) {
    try {
      const { id } = request.params()
      const username = request.input('username', '')
      const data = request.all()
      const { name, description } = await editBidValidator.validate(data)

      if (!username) {
        return response.status(400).json({ reason: 'Неверный формат запроса или его параметры.' })
      }

      const user = await Employee.findBy('username', username)
      if (user === null) {
        return response.status(401).json({ reason: 'Пользователь не существует или некорректен.' })
      }

      const bid = await Bid.findBy('id', id)
      if (!bid) {
        return response.status(404).json({ reason: 'Предложение не найдено.' })
      }

      if (bid.createdBy !== user.id) {
        return response.status(403).json({ reason: 'Недостаточно прав для выполнения действия.' })
      }

      const archiveSuccess = await archiveCurrentBid(bid)
      if (!archiveSuccess) {
        return response.status(500).json({ reason: 'Ошибка архивации предложения.' })
      }

      bid.merge({
        name: !name ? bid.name : name,
        description: !description ? bid.description : description,
        version: bid.version + 1,
      })
      await bid.save()

      return response.status(200).json({
        id: bid.id,
        name: bid.name,
        status: bid.status,
        authorType: bid.authorType,
        authorId: bid.authorId,
        version: bid.version,
        createdAt: bid.createdAt,
      })
    } catch (error) {
      console.error(error)
      if (error.code === 'E_VALIDATION_ERROR') {
        return response.status(400).json({
          reason: `Ошибка валидации: ${error.messages
            .map((i: { message: string; rule: string; field: string }) => `${i.field}`)
            .join(', ')}`,
        })
      }
      return response.status(400).json({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async submitDecision({ request, response }: HttpContext) {
    try {
      const { id } = request.params()
      const username = request.input('username', '')
      const decision = request.input('decision', '')

      if (!username || !decision) {
        return response.status(400).json({ reason: 'Неверный формат запроса или его параметры.' })
      }

      if (!['Rejected', 'Approved'].includes(decision)) {
        return response.status(400).json({ reason: 'Некорректное значение решения.' })
      }

      const user = await Employee.findBy('username', username)
      if (!user) {
        return response.status(401).json({ reason: 'Пользователь не найден.' })
      }

      const bid = await Bid.findBy('id', id)
      if (!bid) {
        return response.status(404).json({ reason: 'Предложение не найдено.' })
      }

      const tender = await Tender.findBy('id', bid.tenderId)
      if (!tender) {
        return response.status(404).json({ reason: 'Тендер не найден.' })
      }

      const organization = await Organization.findBy('id', tender.organization)
      if (!organization) {
        return response.status(404).json({ reason: 'Организация не найдена.' })
      }

      if (user.id === bid.createdBy) {
        return response
          .status(403)
          .json({ reason: 'Нельзя принять решение по собственному предложению.' })
      }

      const organizationResponsible = await OrganizationResponsible.query()
        .where('user_id', user.id)
        .where('organization_id', organization.id)
        .first()

      if (!organizationResponsible) {
        return response.status(403).json({ reason: 'Недостаточно прав для выполнения действия.' })
      }

      const existingDecision = await Decision.findBy('bid_id', bid.id)
      if (existingDecision) {
        return response.status(400).json({ reason: 'Решение уже было принято.' })
      }

      if (bid.status === 'Canceled' || bid.status === 'Created') {
        return response.status(403).json({ reason: 'Недостаточно прав для выполнения действия.' })
      }
      await Decision.create({
        bidId: bid.id,
        decision,
        createdBy: user.id,
      })

      return response.status(200).json({
        id: bid.id,
        name: bid.name,
        status: bid.status,
        authorType: bid.authorType,
        authorId: bid.authorId,
        version: bid.version,
        createdAt: bid.createdAt,
      })
    } catch (error) {
      console.error(error)
      return response.status(400).json({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async sendFeedback({ request, response }: HttpContext) {
    try {
      const { id } = request.params()
      const username = request.input('username', '')
      const bidFeedback = request.input('bidFeedback', '')

      if (!username || !bidFeedback) {
        return response.status(400).json({ reason: 'Неверный формат запроса или его параметры.' })
      }

      const user = await Employee.findBy('username', username)
      if (!user) {
        return response.status(401).json({ reason: 'Пользователь не найден.' })
      }

      const bid = await Bid.findBy('id', id)
      if (!bid) {
        return response.status(404).json({ reason: 'Предложение не найдено.' })
      }

      const tender = await Tender.findBy('id', bid.tenderId)
      if (!tender) {
        return response.status(404).json({ reason: 'Тендер не найден.' })
      }

      if (user.id !== tender.createdBy) {
        return response.status(403).json({ reason: 'Недостаточно прав для выполнения действия.' })
      }
      const existingFeedback = await Feedback.findBy('bid_id', bid.id)
      if (existingFeedback) {
        return response.status(400).json({ reason: 'Отзыв уже был отправлен.' })
      }

      await Feedback.create({
        bidId: bid.id,
        feedback: bidFeedback,
        createdBy: user.id,
      })

      return response.status(200).json({
        id: bid.id,
        name: bid.name,
        status: bid.status,
        authorType: bid.authorType,
        authorId: bid.authorId,
        version: bid.version,
        createdAt: bid.createdAt,
      })
    } catch (error) {
      console.error(error)
      return response.status(400).json({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async rollbackBid({ request, response }: HttpContext) {
    try {
      const { id, version } = request.params()
      const username = request.input('username', '')

      if (!version || !username) {
        return response.status(400).json({ reason: 'Неверный формат запроса или его параметры.' })
      }

      const user = await Employee.findBy('username', username)
      if (!user) {
        return response.status(401).json({ reason: 'Пользователь не найден.' })
      }

      let bid = await Bid.findBy('id', id)
      if (!bid) {
        return response.status(404).json({ reason: 'Предложение не найдено.' })
      }

      if (bid.createdBy !== user.id) {
        return response.status(403).json({ reason: 'Недостаточно прав для выполнения действия.' })
      }

      const rollbackSuccess = await rollbackBidToVersion(bid, parseInt(version))
      if (!rollbackSuccess) {
        return response.status(404).json({ reason: 'Предложение или версия не найдены.' })
      }

      bid = await Bid.findBy('id', id)
      if (!bid) {
        return response.status(404).json({ reason: 'Предложение не найдено.' })
      }
      return response.status(200).json({
        id: bid.id,
        name: bid.name,
        status: bid.status,
        authorType: bid.authorType,
        authorId: bid.authorId,
        version: bid.version,
        createdAt: bid.createdAt,
      })
    } catch (error) {
      console.error(error)
      return response.status(400).json({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }

  async viewFeedback({ request, response }: HttpContext) {
    try {
      const tenderId = request.param('id')
      const authorUsername: string = request.input('authorUsername', '')
      const requesterUsername: string = request.input('requesterUsername', '')
      const limit: number = request.input('limit', 10)
      const offset: number = request.input('offset', 0)

      if (!authorUsername || !requesterUsername) {
        return response.badRequest({ reason: 'Неверный формат запроса или его параметры.' })
      }

      const requester = await Employee.findBy('username', requesterUsername)
      if (!requester) {
        return response.unauthorized({ reason: 'Пользователь не существует или некорректен.' })
      }

      const author = await Employee.findBy('username', authorUsername)
      if (!author) {
        return response.unauthorized({ reason: 'Пользователь не существует или некорректен.' })
      }

      const tender = await Tender.find(tenderId)
      if (!tender) {
        return response.notFound({ reason: 'Тендер не найден.' })
      }

      const organization = await Organization.find(tender.organization)
      if (!organization) {
        return response.notFound({ reason: 'Организация не найдена.' })
      }

      if (requester.id === author.id) {
        return response.forbidden({ reason: 'Недостаточно прав для выполнения действия.' })
      }

      const responsible = await OrganizationResponsible.query()
        .where('user_id', requester.id)
        .andWhere('organization_id', organization.id)
        .first()

      if (!responsible) {
        return response.forbidden({ reason: 'Недостаточно прав для выполнения действия.' })
      }

      const bids = await Bid.query()
        .where('tender_id', tenderId)
        .andWhere('created_by', author.id)
        .select('id')

      if (bids.length === 0) {
        return response.notFound({ reason: 'Предложения для указанного автора не найдены.' })
      }

      const bidIds = bids.map((bid) => bid.id)

      const feedbacks = await Feedback.query()
        .whereIn('bid_id', bidIds)
        .select('id', 'feedback', 'created_by', 'created_at')
        .limit(limit)
        .offset(offset)

      if (feedbacks.length === 0) {
        return response.notFound({ reason: 'Отзывы не найдены.' })
      }

      const formattedFeedbacks = feedbacks.map((feedback) => ({
        id: feedback.id,
        description: feedback.feedback,
        createdAt: feedback.createdAt,
      }))

      return response.ok(formattedFeedbacks)
    } catch (error) {
      console.error(error)
      return response.badRequest({ reason: 'Произошла ошибка при выполнении запроса.' })
    }
  }
}

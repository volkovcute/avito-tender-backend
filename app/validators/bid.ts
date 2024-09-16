import vine from '@vinejs/vine'

export const createBidValidator = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(100),
    description: vine.string().trim().escape().maxLength(500),
    tenderId: vine.string().uuid({ version: [2, 4, 5] }),
    authorType: vine.enum(['Organization', 'User']),
    authorId: vine.string().uuid({ version: [2, 4, 5] }),
  })
)

export const editBidValidator = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(100).optional(),
    description: vine.string().trim().escape().maxLength(500).optional(),
  })
)

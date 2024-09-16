import vine from '@vinejs/vine'

export const createTenderValidator = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(100),
    description: vine.string().trim().escape().maxLength(500),
    serviceType: vine.enum(['Construction', 'Delivery', 'Manufacture']),
    organizationId: vine.string().trim().maxLength(100),
    creatorUsername: vine.string().trim(),
  })
)

export const editTenderValidator = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(100).optional(),
    description: vine.string().trim().escape().maxLength(500).optional(),
    serviceType: vine.enum(['Construction', 'Delivery', 'Manufacture']).optional(),
  })
)

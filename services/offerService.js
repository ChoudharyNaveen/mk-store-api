const { offer: OfferModel, sequelize } = require('../database')
const { v4: uuidV4 } = require('uuid')
const Helper = require('../utils/helper')
const { uploadFile } = require('../config/azure')
const cron = require('node-cron')
const { Op } = require('sequelize')

const saveOffer = async ({ data, imageFile }) => {
  let transaction = null
  try {
    const { createdBy, ...datas } = data
    transaction = await sequelize.transaction()
    const concurrencyStamp = uuidV4()

    let imageUrl = null

    const doc = {
      ...datas,
      concurrencyStamp,
      createdBy,
    }

    const cat = await OfferModel.create(Helper.convertCamelToSnake(doc), {
      transaction,
    })

    if (imageFile) {
      const blobName = `offer-${cat.id}-${Date.now()}.jpg`
      imageUrl = await uploadFile(imageFile, blobName)
      await OfferModel.update({ image: imageUrl }, {
        where: { id: cat.id },
        transaction,
      })
    }
    await transaction.commit()
    return { doc: { cat } }
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    return { errors: { message: 'failed to save course offer' } }
  }
}

const updateOffer = async ({ data, imageFile }) => {
  let transaction = null
  const { id, ...datas } = data
  const { concurrencyStamp, updatedBy } = datas

  try {
    transaction = await sequelize.transaction()
    const response = await OfferModel.findOne({
      where: { id: id },
    })

    if (response) {
      const { concurrency_stamp: stamp } = response
      if (concurrencyStamp === stamp) {
        const newConcurrencyStamp = uuidV4()
        const doc = {
          ...Helper.convertCamelToSnake(data),
          updatedBy,
          concurrency_stamp: newConcurrencyStamp,
        }
        if (imageFile) {
          const blobName = `offer-${id}-${Date.now()}.jpg`
          const imageUrl = await uploadFile(imageFile, blobName)
          doc.image = imageUrl
        }
        await OfferModel.update(doc, {
          where: { id: id },
          transaction,
        })
        await transaction.commit()
        return { doc: { concurrencyStamp: newConcurrencyStamp } }
      }
      await transaction.rollback()
      return { concurrencyError: { message: 'invalid concurrency stamp' } }
    }
    return {}
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    return { errors: { message: 'transaction failed' } }
  }
}

const getOffer = async (payload) => {
  const { pageSize, pageNumber, filters, sorting } = payload
  const limit = pageSize
  const offset = limit * (pageNumber - 1)

  const where = Helper.generateWhereCondition(filters)
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [['createdAt', 'DESC']]

  const response = await OfferModel.findAndCountAll({
    where: { ...where,status:'ACTIVE' },
    order,
    limit,
    offset,
  })
  const doc = []
  if (response) {
    const { count, rows } = response
    rows.map((element) => doc.push(element.dataValues))
    return { count, doc }
  }
  return { count: 0, doc: [] }
}

async function cronJobForUpdatingOfferStatus() {
  cron.schedule('0 0 * * *', async () => {
    try {
      const today = new Date()
      await OfferModel.update(
        { status: 'ACTIVE' },
        {
          where: {
            start_date: { [Op.lte]: today },
            end_date: { [Op.gte]: today },
            status: 'OPEN',
          },
        }
      )

      await OfferModel.update(
        { status: 'INACTIVE' },
        {
          where: {
            [Op.or]: [
              { start_date: { [Op.gt]: today } },
              { end_date: { [Op.lt]: today } },
            ],
            status: 'ACTIVE',
          },
        }
      )

      console.log(
        `[Offer Scheduler] Offer statuses updated on ${today.toISOString()}`
      )
    } catch (error) {
      console.error('[Offer Cron] Error updating offers:', error)
    }
  })
}

module.exports = {
  saveOffer,
  updateOffer,
  getOffer,
  cronJobForUpdatingOfferStatus,
}

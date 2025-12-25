const { promocode: PromocodeModel, sequelize } = require('../database')
const { v4: uuidV4 } = require('uuid')
const Helper = require('../utils/helper')

const savePromocode = async (data) => {
  let transaction = null
  try {
    const { createdBy, ...datas } = data
    transaction = await sequelize.transaction()
    const concurrencyStamp = uuidV4()

    const doc = {
      ...datas,
      concurrencyStamp,
      createdBy,
    }

    const cat = await PromocodeModel.create(Helper.convertCamelToSnake(doc), {
      transaction,
    })
    await transaction.commit()
    return { doc: { cat } }
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    return { errors: { message: 'failed to save course Promocode' } }
  }
}

const updatePromocode = async (data) => {
  let transaction = null
  const { id, ...datas } = data
  const { concurrencyStamp, updatedBy } = datas

  try {
    transaction = await sequelize.transaction()
    const response = await PromocodeModel.findOne({
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

        await PromocodeModel.update(doc, {
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

const getPromocode = async (payload) => {
  const { pageSize, pageNumber, filters, sorting } = payload
  const limit = pageSize
  const offset = limit * (pageNumber - 1)

  const where = Helper.generateWhereCondition(filters)
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [['createdAt', 'DESC']]

  const response = await PromocodeModel.findAndCountAll({
    where: { ...where },
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

module.exports = {
  savePromocode,
  updatePromocode,
  getPromocode,
}

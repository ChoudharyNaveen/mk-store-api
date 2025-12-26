const {
  address: AddressModel,
  user: UserModel,
  sequelize,
} = require('../database')
const { v4: uuidV4 } = require('uuid')
const Helper = require('../utils/helper')

const saveAddress = async (data) => {
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
    const cat = await AddressModel.create(Helper.convertCamelToSnake(doc), {
      transaction,
    })
    await transaction.commit()
    return { doc: { cat } }
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    return { errors: { message: 'failed to save address' } }
  }
}

const updateAddress = async ( data) => {
  let transaction = null
  const { id, ...datas } = data
  const { concurrencyStamp, updatedBy } = datas

  try {
    transaction = await sequelize.transaction()
    const response = await AddressModel.findOne({
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

        await AddressModel.update(doc, {
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

const getAddress = async (payload) => {
  const { pageSize, pageNumber, filters, sorting } = payload
  const { limit, offset } = Helper.calculatePagination(pageSize, pageNumber)

  const where = Helper.generateWhereCondition(filters)
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [['createdAt', 'DESC']]

  const response = await AddressModel.findAndCountAll({
    where: { ...where },
    include: [
      {
        model: UserModel,
        as: 'user',
      },
    ],
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
  saveAddress,
  updateAddress,
  getAddress,
}

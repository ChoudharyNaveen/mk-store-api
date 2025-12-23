const { category: CategoryModel, sequelize } = require('../database')
const { v4: uuidV4 } = require('uuid')
const Helper = require('../utils/helper')
const { uploadFile } = require('../config/azure')

const saveCategory = async ({ data, imageFile }) => {
  let transaction = null
  try {
    const { createdBy, ...datas } = data
    transaction = await sequelize.transaction()
    const publicId = uuidV4()
    const concurrencyStamp = uuidV4()

    let imageUrl = null

    const doc = {
      ...datas,
      publicId,
      concurrencyStamp,
      createdBy,
    }

    if (imageFile) {
      const blobName = `category-${publicId}-${Date.now()}.jpg`
      imageUrl = await uploadFile(imageFile, blobName)
    }
    doc.image = imageUrl
    const cat = await CategoryModel.create(Helper.convertCamelToSnake(doc), {
      transaction,
    })
    await transaction.commit()
    return { doc: { cat } }
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    return { errors: { message: 'failed to save category' } }
  }
}

const updateCategory = async ({ data, imageFile }) => {
  let transaction = null
  const { publicId, ...datas } = data
  const { concurrencyStamp, updatedBy } = datas

  try {
    transaction = await sequelize.transaction()
    const response = await CategoryModel.findOne({
      where: { public_id: publicId },
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
          const blobName = `category-${publicId}-${Date.now()}.jpg`
          const imageUrl = await uploadFile(imageFile, blobName)
          doc.image = imageUrl
        }
        await CategoryModel.update(doc, {
          where: { public_id: publicId },
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

const getCategory = async (payload) => {
  const { pageSize, pageNumber, filters, sorting } = payload
  const limit = pageSize
  const offset = limit * (pageNumber - 1)

  const where = Helper.generateWhereCondition(filters)
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [['createdAt', 'DESC']]

  const response = await CategoryModel.findAndCountAll({
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
  saveCategory,
  updateCategory,
  getCategory,
}

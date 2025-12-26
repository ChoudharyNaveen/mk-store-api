const { category: CategoryModel, branch: BranchModel, sequelize } = require('../database')
const { v4: uuidV4 } = require('uuid')
const Helper = require('../utils/helper')
const { uploadFile } = require('../config/azure')

const saveCategory = async ({ data, imageFile }) => {
  let transaction = null
  try {
    const { createdBy, branchId, ...datas } = data
    transaction = await sequelize.transaction()

    // Verify branch exists and get vendor_id
    if (branchId) {
      const branch = await BranchModel.findOne({
        where: { id: branchId },
      })

      if (!branch) {
        await transaction.rollback()
        return { errors: { message: 'Branch not found' } }
      }

      // Set vendor_id from branch
      datas.vendorId = branch.vendor_id
      datas.branchId = branchId
    }

    const concurrencyStamp = uuidV4()

    let imageUrl = null

    const doc = {
      ...datas,
      concurrencyStamp,
      createdBy,
      image:'NA'
    }

    const cat = await CategoryModel.create(Helper.convertCamelToSnake(doc), {
      transaction,
    })

    if (imageFile) {
      const blobName = `category-${cat.id}-${Date.now()}.jpg`
      imageUrl = await uploadFile(imageFile, blobName)
      await CategoryModel.update({ image: imageUrl }, {
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
    return { errors: { message: 'failed to save category' } }
  }
}

const updateCategory = async ({ data, imageFile }) => {
  let transaction = null
  const { id, ...datas } = data
  const { concurrencyStamp, updatedBy } = datas

  try {
    transaction = await sequelize.transaction()
    const response = await CategoryModel.findOne({
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
          const blobName = `category-${id}-${Date.now()}.jpg`
          const imageUrl = await uploadFile(imageFile, blobName)
          doc.image = imageUrl
        }
        await CategoryModel.update(doc, {
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

const getCategory = async (payload) => {
  const { pageSize, pageNumber, filters, sorting } = payload
  const { limit, offset } = Helper.calculatePagination(pageSize, pageNumber)

  const where = Helper.generateWhereCondition(filters)
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [['createdAt', 'DESC']]

  const response = await CategoryModel.findAndCountAll({
    where: { ...where },
    attributes: ['id', 'title', 'description', 'image', 'status'],
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

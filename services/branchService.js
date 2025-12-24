const { branch: BranchModel, vendor: VendorModel, sequelize } = require('../database')
const { v4: uuidV4 } = require('uuid')
const Helper = require('../utils/helper')

const saveBranch = async ({ data }) => {
  let transaction = null
  try {
    const { createdBy, vendorId, ...datas } = data
    transaction = await sequelize.transaction()

    // Verify vendor exists
    const vendor = await VendorModel.findOne({
      where: { public_id: vendorId },
    })

    if (!vendor) {
      await transaction.rollback()
      return { errors: { message: 'Vendor not found' } }
    }

    const publicId = uuidV4()
    const concurrencyStamp = uuidV4()

    const doc = {
      ...datas,
      vendorId,
      publicId,
      concurrencyStamp,
      createdBy,
    }

    const branch = await BranchModel.create(Helper.convertCamelToSnake(doc), {
      transaction,
    })
    await transaction.commit()
    return { doc: { branch } }
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    return { errors: { message: 'failed to save branch' } }
  }
}

const updateBranch = async ({ data }) => {
  let transaction = null
  const { publicId, ...datas } = data
  const { concurrencyStamp, updatedBy, vendorId } = datas

  try {
    transaction = await sequelize.transaction()

    // If vendorId is being updated, verify it exists
    if (vendorId) {
      const vendor = await VendorModel.findOne({
        where: { public_id: vendorId },
      })
      if (!vendor) {
        await transaction.rollback()
        return { errors: { message: 'Vendor not found' } }
      }
    }

    const response = await BranchModel.findOne({
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
        await BranchModel.update(doc, {
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

const getBranch = async (payload) => {
  const { pageSize, pageNumber, filters, sorting } = payload
  const limit = pageSize
  const offset = limit * (pageNumber - 1)

  const where = Helper.generateWhereCondition(filters)
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [['createdAt', 'DESC']]

  const response = await BranchModel.findAndCountAll({
    where: { ...where },
    order,
    limit,
    offset,
    include: [
      {
        model: VendorModel,
        as: 'vendor',
        attributes: ['public_id', 'name', 'email'],
      },
    ],
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
  saveBranch,
  updateBranch,
  getBranch,
}


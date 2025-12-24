const {
  vendor: VendorModel,
  user: UserModel,
  role: RoleModel,
  vendor_user: VendorUserModel,
  sequelize,
} = require('../database')
const { v4: uuidV4 } = require('uuid')
const Helper = require('../utils/helper')

const saveVendor = async ({ data }) => {
  let transaction = null
  try {
    const { createdBy, ...datas } = data
    transaction = await sequelize.transaction()
    const publicId = uuidV4()
    const concurrencyStamp = uuidV4()

    const doc = {
      ...datas,
      publicId,
      concurrencyStamp,
      createdBy,
    }

    const vendor = await VendorModel.create(Helper.convertCamelToSnake(doc), {
      transaction,
    })
    await transaction.commit()
    return { doc: { vendor } }
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    return { errors: { message: 'failed to save vendor' } }
  }
}

const updateVendor = async ({ data }) => {
  let transaction = null
  const { publicId, ...datas } = data
  const { concurrencyStamp, updatedBy } = datas

  try {
    transaction = await sequelize.transaction()
    const response = await VendorModel.findOne({
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
        await VendorModel.update(doc, {
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

const getVendor = async (payload) => {
  const { pageSize, pageNumber, filters, sorting } = payload
  const limit = pageSize
  const offset = limit * (pageNumber - 1)

  const where = Helper.generateWhereCondition(filters)
  const order = sorting
    ? Helper.generateOrderCondition(sorting)
    : [['createdAt', 'DESC']]

  const response = await VendorModel.findAndCountAll({
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

const getVendorWithUsers = async (vendorId) => {
  try {
    const adminRole = await RoleModel.findOne({
      where: { name: 'admin' },
    })
    const riderRole = await RoleModel.findOne({
      where: { name: 'rider' },
    })

    if (!adminRole || !riderRole) {
      return { errors: { message: 'Roles not found' } }
    }

    const vendor = await VendorModel.findOne({
      where: { public_id: vendorId },
      include: [
        {
          model: VendorUserModel,
          as: 'vendorUsers',
          include: [
            {
              model: UserModel,
              as: 'user',
              include: [{ model: RoleModel, as: 'role' }],
            },
            {
              model: RoleModel,
              as: 'role',
            },
          ],
        },
      ],
    })

    if (!vendor) {
      return { errors: { message: 'Vendor not found' } }
    }

    // Separate admin and riders
    const adminMapping = vendor.vendorUsers.find(
      (vu) => vu.role_id === adminRole.dataValues.public_id && vu.status === 'ACTIVE'
    )
    const riderMappings = vendor.vendorUsers.filter(
      (vu) => vu.role_id === riderRole.dataValues.public_id && vu.status === 'ACTIVE'
    )

    const result = {
      ...vendor.dataValues,
      admin: adminMapping ? adminMapping.user : null,
      riders: riderMappings.map((rm) => rm.user),
    }

    return { doc: result }
  } catch (error) {
    console.log(error)
    return { errors: { message: 'failed to get vendor with users' } }
  }
}

module.exports = {
  saveVendor,
  updateVendor,
  getVendor,
  getVendorWithUsers,
}


const {
  vendor: VendorModel,
  branch: BranchModel,
  user: UserModel,
  role: RoleModel,
  user_roles_mappings: UserRolesMappingModel,
  sequelize,
} = require('../database')
const { v4: uuidV4 } = require('uuid')
const Helper = require('../utils/helper')

const saveVendor = async ({ data }) => {
  let transaction = null
  try {
    const {
      createdBy,
      code,
      branchName,
      branchCode,
      addressLine1,
      addressLine2,
      street,
      city,
      state,
      pincode,
      latitude,
      longitude,
      branchPhone,
      branchEmail,
      branchStatus,
      ...vendorDatas
    } = data
    transaction = await sequelize.transaction()

    // Check if vendor code is provided and if it already exists
    if (code) {
      const existingVendor = await VendorModel.findOne({
        where: { code: code },
        transaction,
      })

      if (existingVendor) {
        await transaction.rollback()
        return { errors: { message: 'Vendor code already exists. Please use a different code.' } }
      }
    }

    // Check if branch code is provided and if it already exists
    if (branchCode) {
      const existingBranch = await BranchModel.findOne({
        where: { code: branchCode },
        transaction,
      })

      if (existingBranch) {
        await transaction.rollback()
        return { errors: { message: 'Branch code already exists. Please use a different code.' } }
      }
    }

    const concurrencyStamp = uuidV4()

    const vendorDoc = {
      ...vendorDatas,
      code: code || null,
      concurrencyStamp,
      createdBy,
    }

    const vendor = await VendorModel.create(Helper.convertCamelToSnake(vendorDoc), {
      transaction,
    })

    // Create branch for the vendor
    const branchConcurrencyStamp = uuidV4()
    const branchDoc = {
      vendorId: vendor.id,
      name: branchName,
      code: branchCode || null,
      addressLine1: addressLine1 || null,
      addressLine2: addressLine2 || null,
      street: street || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      latitude: latitude || null,
      longitude: longitude || null,
      phone: branchPhone || null,
      email: branchEmail || null,
      status: branchStatus || 'ACTIVE',
      concurrencyStamp: branchConcurrencyStamp,
      createdBy,
    }

    const branch = await BranchModel.create(Helper.convertCamelToSnake(branchDoc), {
      transaction,
    })

    await transaction.commit()
    return { doc: { vendor, branch } }
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    // Handle unique constraint violation from database
    if (error.name === 'SequelizeUniqueConstraintError') {
      if (error.errors && error.errors.some((e) => e.path === 'code' && e.instance?.tableName === 'vendor')) {
        return { errors: { message: 'Vendor code already exists. Please use a different code.' } }
      }
      if (error.errors && error.errors.some((e) => e.path === 'code' && e.instance?.tableName === 'branch')) {
        return { errors: { message: 'Branch code already exists. Please use a different code.' } }
      }
      if (error.errors && error.errors.some((e) => e.path === 'email')) {
        return { errors: { message: 'Vendor email already exists. Please use a different email.' } }
      }
    }
    return { errors: { message: 'failed to save vendor' } }
  }
}

const updateVendor = async ({ data }) => {
  let transaction = null
  const { id, ...datas } = data
  const { concurrencyStamp, updatedBy } = datas

  try {
    transaction = await sequelize.transaction()
    const response = await VendorModel.findOne({
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
        await VendorModel.update(doc, {
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

const getVendorByCode = async (code) => {
  try {
    const vendor = await VendorModel.findOne({
      where: { code: code },
    })

    if (!vendor) {
      return { errors: { message: 'Vendor not found' } }
    }

    return { doc: vendor.dataValues }
  } catch (error) {
    console.log(error)
    return { errors: { message: 'failed to get vendor by code' } }
  }
}

const getVendorWithUsers = async (vendorId) => {
  try {
    const adminRole = await RoleModel.findOne({
      where: { name: 'VENDOR_ADMIN' },
    })
    const riderRole = await RoleModel.findOne({
      where: { name: 'rider' },
    })

    if (!adminRole || !riderRole) {
      return { errors: { message: 'Roles not found' } }
    }

    const vendor = await VendorModel.findOne({
      where: { id: vendorId },
      include: [
        {
          model: UserRolesMappingModel,
          as: 'userRoleMappings',
          include: [
            {
              model: UserModel,
              as: 'user',
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
    const adminMapping = vendor.userRoleMappings.find(
      (urm) => urm.role_id === adminRole.id && urm.status === 'ACTIVE'
    )
    const riderMappings = vendor.userRoleMappings.filter(
      (urm) => urm.role_id === riderRole.id && urm.status === 'ACTIVE'
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
  getVendorByCode,
  getVendorWithUsers,
}


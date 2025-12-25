const {
  user: UserModel,
  role: RoleModel,
  vendor: VendorModel,
  user_roles_mappings: UserRolesMappingModel,
  sequelize,
  Sequelize: { Op },
} = require('../database')
const { v4: uuidV4 } = require('uuid')
const bcrypt = require('bcrypt')
const saltRounds = 10
const Helper = require('../utils/helper')
const { uploadFile } = require('../config/azure')

// Create Super Admin
const createSuperAdmin = async ({ data, imageFile }) => {
  let transaction = null
  try {
    const {
      name,
      mobile_number,
      email,
      password,
      confirm_password,
      date_of_birth,
      gender,
      status,
    } = data

    // Check if user already exists
    const userExists = await UserModel.findOne({
      where: {
        [Op.or]: [{ email: email }, { mobile_number: mobile_number }],
      },
      attributes: ['id', 'name', 'mobile_number', 'email'],
    })
    if (userExists) {
      return { errors: 'user already exists with that email or mobile number' }
    }

    if (password !== confirm_password) {
      return { errors: 'password missmatched' }
    }

    transaction = await sequelize.transaction()
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Get or create SUPER_ADMIN role
    let superAdminRole = await RoleModel.findOne({
      where: { name: 'SUPER_ADMIN' },
    })

    if (!superAdminRole) {
      return { errors: 'Super admin role not found' }
    }


    const concurrency_stamp = uuidV4()
    const doc = {
      concurrency_stamp,
      name,
      mobile_number,
      email,
      password: hashedPassword,
      date_of_birth,
      gender,
      status: status || 'ACTIVE',
      profile_status: 'COMPLETE',
    }

    const user = await UserModel.create(doc, {
      transaction,
    })

    if (imageFile) {
      const blobName = `user-${user.id}-${Date.now()}.jpg`
      const imageUrl = await uploadFile(imageFile, blobName)
      await UserModel.update({ image: imageUrl }, {
        where: { id: user.id },
        transaction,
      })
    }

    // Create mapping entry
    const mappingConcurrencyStamp = uuidV4()
    await UserRolesMappingModel.create(
      {
        user_id: user.id,
        role_id: superAdminRole.id,
        status: 'ACTIVE',
        concurrency_stamp: mappingConcurrencyStamp,
      },
      { transaction }
    )

    await transaction.commit()

    // Return only the created user data - use dataValues to avoid any association loading
    const userData = user.dataValues
    return { doc: userData }
  } catch (error) {
    if (transaction) {
      await transaction.rollback()
    }
    console.log(error)
    return { errors: 'failed to create super admin' }
  }
}

// Find user by email
const findUserByEmail = async (payload) => {
  const { email } = payload

  const response = await UserModel.findOne({
    where: {
      email: email,
    },
  })

  return response
}

// Get user by ID
const getUserById = async (payload) => {
  const { id } = payload

  const response = await UserModel.findOne({
    where: { id: id },
  })
  if (response) {
    const { dataValues } = response
    const doc = Helper.convertSnakeToCamel(dataValues)

    return { doc }
  }
  return {}
}

// Create Vendor Admin
const createVendorAdmin = async ({ data, imageFile }) => {
  let transaction = null
  try {
    const { vendorId, name, mobile_number, email, password, ...otherData } = data

    transaction = await sequelize.transaction()

    // Verify vendor exists
    const vendor = await VendorModel.findOne({
      where: { id: vendorId },
    })

    if (!vendor) {
      await transaction.rollback()
      return { errors: { message: 'Vendor not found' } }
    }

    // Get admin role
    const adminRole = await RoleModel.findOne({
      where: { name: 'VENDOR_ADMIN' },
    })

    if (!adminRole) {
      await transaction.rollback()
      return { errors: { message: 'Admin role not found' } }
    }

    // Check if vendor already has an admin in mapping table
    const existingAdmin = await UserRolesMappingModel.findOne({
      where: {
        vendor_id: vendorId,
        role_id: adminRole.id,
        status: 'ACTIVE',
      },
    })

    if (existingAdmin) {
      await transaction.rollback()
      return { errors: { message: 'Vendor already has an admin assigned' } }
    }

    // Check if user already exists
    const userExists = await UserModel.findOne({
      where: {
        [Op.or]: [{ email: email }, { mobile_number: mobile_number }],
      },
    })

    if (userExists) {
      await transaction.rollback()
      return {
        errors: { message: 'User already exists with that email or mobile number' },
      }
    }

    // Hash password if provided
    let hashedPassword = null
    if (password) {
      hashedPassword = await bcrypt.hash(password, saltRounds)
    }

    const concurrency_stamp = uuidV4()

    const doc = {
      concurrency_stamp,
      name,
      mobile_number,
      email,
      password: hashedPassword,
      profile_status: 'COMPLETE',
      ...otherData,
    }

    const user = await UserModel.create(doc, { transaction })

    if (imageFile) {
      const blobName = `user-${user.id}-${Date.now()}.jpg`
      const imageUrl = await uploadFile(imageFile, blobName)
      await UserModel.update({ image: imageUrl }, {
        where: { id: user.id },
        transaction,
      })
    }

    // Create mapping entry
    const mappingConcurrencyStamp = uuidV4()
    await UserRolesMappingModel.create(
      {
        vendor_id: vendorId,
        user_id: user.id,
        role_id: adminRole.id,
        status: 'ACTIVE',
        concurrency_stamp: mappingConcurrencyStamp,
      },
      { transaction }
    )

    await transaction.commit()
    return { doc: { user } }
  } catch (error) {
    if (transaction) {
      await transaction.rollback()
    }
    console.log(error)
    return { errors: { message: 'failed to create vendor admin' } }
  }
}

// Update User
const updateUser = async ({ data, imageFile }) => {
  let transaction = null
  const { id, password, ...datas } = data
  const { concurrencyStamp, updatedBy } = datas

  try {
    transaction = await sequelize.transaction()
    const response = await UserModel.findOne({
      where: { id: id },
    })

    if (response) {
      const { concurrency_stamp: stamp } = response
      if (concurrencyStamp === stamp) {
        const newConcurrencyStamp = uuidV4()
        const doc = {
          ...Helper.convertCamelToSnake(datas),
          updatedBy,
          profile_status: 'COMPLETE',
          concurrency_stamp: newConcurrencyStamp,
        }

        if (imageFile) {
          const blobName = `user-${id}-${Date.now()}.jpg`
          const imageUrl = await uploadFile(imageFile, blobName)
          doc.image = imageUrl
        }

        if (password) {
          const hashedPassword = await bcrypt.hash(password, saltRounds)
          doc.password = hashedPassword
        }

        await UserModel.update(doc, {
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

module.exports = {
  createSuperAdmin,
  findUserByEmail,
  getUserById,
  createVendorAdmin,
  updateUser,
}

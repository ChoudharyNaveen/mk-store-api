const {
  user: UserModel,
  role: RoleModel,
  address: AddressModel,
  vendor: VendorModel,
  vendor_user: VendorUserModel,
  sequelize,
  Sequelize: { Op },
} = require('../database')
const { v4: uuidV4 } = require('uuid')
const bcrypt = require('bcrypt')
const saltRounds = 10
const Helper = require('../utils/helper')
const { uploadFile } = require('../config/azure')

const userSignUp = async ({ data, imageFile }) => {
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
    } = data
    const userExists = await UserModel.findOne({
      where: {
        [Op.or]: [{ email: email }, { mobile_number: mobile_number }],
      },
    })
    if (userExists) {
      return { errors: 'user already exists with that email or mobile number' }
    }
    if (password !== confirm_password) {
      return { errors: 'password missmatched' }
    }
    transaction = await sequelize.transaction()
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    const riderRole = await RoleModel.findOne({
      where: { name: 'rider' },
    })

    const public_id = uuidV4()
    const concurrency_stamp = uuidV4()
    const doc = {
      public_id,
      concurrency_stamp,
      name,
      mobile_number,
      email,
      password: hashedPassword,
      date_of_birth,
      gender,
      role_id: riderRole.dataValues.public_id,
    }

    if (imageFile) {
      const blobName = `user-${public_id}-${Date.now()}.jpg`
      imageUrl = await uploadFile(imageFile, blobName)
      doc.image = imageUrl
    }

    const user = await UserModel.create(doc, transaction)
    await transaction.commit()
    return { doc: user }
  } catch (error) {
    if (transaction) {
      await transaction.rollback()
    }
    console.log(error)
    return { errors: 'failed to register' }
  }
}

const findUserByEmailOrMobile = async (payload) => {
  const { email, mobile_number } = payload

  const response = await UserModel.findOne({
    where: {
      [Op.or]: [{ email: email }, { mobile_number: mobile_number }],
    },
    include: [{ model: RoleModel, as: 'role' }],
  })

  return response
}

const getTotalUsers = async () => {
  const userRole = await RoleModel.findOne({
    where: {
      name: 'user',
    },
  })
  const roleId = userRole.dataValues.public_id

  const doc = await UserModel.findAndCountAll({
    where: {
      role_id: roleId,
    },
  })

  return doc
}
const getUserById = async (payload) => {
  const { publicId } = payload

  const response = await UserModel.findOne({
    where: { public_id: publicId },
  })
  if (response) {
    const { dataValues } = response
    const doc = Helper.convertSnakeToCamel(dataValues)

    return { doc }
  }
  return {}
}

const updateUser = async ({ data, imageFile }) => {
  let transaction = null
  const { publicId, password, ...datas } = data
  const { concurrencyStamp, updatedBy } = datas

  try {
    transaction = await sequelize.transaction()
    const response = await UserModel.findOne({
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
          const blobName = `user-${publicId}-${Date.now()}.jpg`
          const imageUrl = await uploadFile(imageFile, blobName)
          doc.image = imageUrl
        }

        if (password) {
          const hashedPassword = await bcrypt.hash(password, saltRounds)
          doc.password = hashedPassword
        }

        await UserModel.update(doc, {
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

const findUserByEmail = async (payload) => {
  const { email } = payload

  const response = await UserModel.findOne({
    where: {
      email: email,
    },
    include: [{ model: RoleModel, as: 'role' }],
  })

  return response
}

const customerSignUp = async ({ data, imageFile }) => {
  let transaction = null
  try {
    const { name, mobile_number, email, password, confirm_password } = data
    const userExists = await UserModel.findOne({
      where: {
        [Op.or]: [{ email: email }, { mobile_number: mobile_number }],
      },
    })
    if (userExists) {
      return { errors: 'user already exists with that email or mobile number' }
    }
    transaction = await sequelize.transaction()
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    const riderRole = await RoleModel.findOne({
      where: { name: 'user' },
    })

    const public_id = uuidV4()
    const concurrency_stamp = uuidV4()
    const doc = {
      public_id,
      concurrency_stamp,
      name,
      mobile_number,
      email,
      password: hashedPassword,
      role_id: riderRole.dataValues.public_id,
    }

    if (imageFile) {
      const blobName = `user-${public_id}-${Date.now()}.jpg`
      imageUrl = await uploadFile(imageFile, blobName)
      doc.image = imageUrl
    }

    const user = await UserModel.create(doc, transaction)
    await transaction.commit()
    return { doc: user }
  } catch (error) {
    if (transaction) {
      await transaction.rollback()
    }
    console.log(error)
    return { errors: 'failed to register' }
  }
}

const updateUserProfile = async ({ data, imageFile }) => {
  let transaction = null
  const { publicId, ...datas } = data
  const { concurrencyStamp, updatedBy, name, email } = datas

  try {
    transaction = await sequelize.transaction()
    const response = await UserModel.findOne({
      where: { public_id: publicId },
    })

    if (!response) {
      await transaction.rollback()
      return { errors: { message: 'User not found' } }
    }

    const { concurrency_stamp: stamp } = response

    if (concurrencyStamp !== stamp) {
      await transaction.rollback()
      return { concurrencyError: { message: 'invalid concurrency stamp' } }
    }

    // Validate required fields for profile completion
    if (!name || !email) {
      await transaction.rollback()
      return { errors: { message: 'Name and email are required to complete profile' } }
    }

    const newConcurrencyStamp = uuidV4()
    const doc = {
      ...Helper.convertCamelToSnake(datas),
      updatedBy,
      concurrency_stamp: newConcurrencyStamp,
      profile_status: 'COMPLETE', // Set profile status to COMPLETE
    }

    if (imageFile) {
      const blobName = `user-${publicId}-${Date.now()}.jpg`
      const imageUrl = await uploadFile(imageFile, blobName)
      doc.image = imageUrl
    }

    await UserModel.update(doc, {
      where: { public_id: publicId },
      transaction,
    })

    await transaction.commit()
    return { doc: { concurrencyStamp: newConcurrencyStamp } }
  } catch (error) {
    console.log(error)
    if (transaction) {
      await transaction.rollback()
    }
    return { errors: { message: 'transaction failed' } }
  }
}

const createVendorAdmin = async ({ data, imageFile }) => {
  let transaction = null
  try {
    const { vendorId, name, mobile_number, email, password, ...otherData } = data

    transaction = await sequelize.transaction()

    // Verify vendor exists
    const vendor = await VendorModel.findOne({
      where: { public_id: vendorId },
    })

    if (!vendor) {
      await transaction.rollback()
      return { errors: { message: 'Vendor not found' } }
    }

    // Get admin role
    const adminRole = await RoleModel.findOne({
      where: { name: 'admin' },
    })

    if (!adminRole) {
      await transaction.rollback()
      return { errors: { message: 'Admin role not found' } }
    }

    // Check if vendor already has an admin in mapping table
    const existingAdmin = await VendorUserModel.findOne({
      where: {
        vendor_id: vendorId,
        role_id: adminRole.dataValues.public_id,
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

    const public_id = uuidV4()
    const concurrency_stamp = uuidV4()

    const doc = {
      public_id,
      concurrency_stamp,
      name,
      mobile_number,
      email,
      password: hashedPassword,
      role_id: adminRole.dataValues.public_id,
      vendor_id: vendorId,
      ...otherData,
    }

    if (imageFile) {
      const blobName = `user-${public_id}-${Date.now()}.jpg`
      const imageUrl = await uploadFile(imageFile, blobName)
      doc.image = imageUrl
    }

    const user = await UserModel.create(doc, { transaction })

    // Create mapping entry
    const mappingPublicId = uuidV4()
    const mappingConcurrencyStamp = uuidV4()
    await VendorUserModel.create(
      {
        public_id: mappingPublicId,
        vendor_id: vendorId,
        user_id: public_id,
        role_id: adminRole.dataValues.public_id,
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

const createVendorRider = async ({ data, imageFile }) => {
  let transaction = null
  try {
    const { vendorId, name, mobile_number, email, password, ...otherData } = data

    transaction = await sequelize.transaction()

    // Verify vendor exists
    const vendor = await VendorModel.findOne({
      where: { public_id: vendorId },
    })

    if (!vendor) {
      await transaction.rollback()
      return { errors: { message: 'Vendor not found' } }
    }

    // Get rider role
    const riderRole = await RoleModel.findOne({
      where: { name: 'rider' },
    })

    if (!riderRole) {
      await transaction.rollback()
      return { errors: { message: 'Rider role not found' } }
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

    const public_id = uuidV4()
    const concurrency_stamp = uuidV4()

    const doc = {
      public_id,
      concurrency_stamp,
      name,
      mobile_number,
      email,
      password: hashedPassword,
      role_id: riderRole.dataValues.public_id,
      vendor_id: vendorId,
      ...otherData,
    }

    if (imageFile) {
      const blobName = `user-${public_id}-${Date.now()}.jpg`
      const imageUrl = await uploadFile(imageFile, blobName)
      doc.image = imageUrl
    }

    const user = await UserModel.create(doc, { transaction })

    // Create mapping entry
    const mappingPublicId = uuidV4()
    const mappingConcurrencyStamp = uuidV4()
    await VendorUserModel.create(
      {
        public_id: mappingPublicId,
        vendor_id: vendorId,
        user_id: public_id,
        role_id: riderRole.dataValues.public_id,
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
    return { errors: { message: 'failed to create vendor rider' } }
  }
}

const getVendorRiders = async (vendorId) => {
  try {
    const riderRole = await RoleModel.findOne({
      where: { name: 'rider' },
    })

    if (!riderRole) {
      return { errors: { message: 'Rider role not found' } }
    }

    const riders = await VendorUserModel.findAll({
      where: {
        vendor_id: vendorId,
        role_id: riderRole.dataValues.public_id,
        status: 'ACTIVE',
      },
      include: [
        {
          model: UserModel,
          as: 'user',
          include: [{ model: RoleModel, as: 'role' }],
        },
      ],
    })

    return { doc: riders.map((r) => r.user) }
  } catch (error) {
    console.log(error)
    return { errors: { message: 'failed to get vendor riders' } }
  }
}

const getVendorAdmin = async (vendorId) => {
  try {
    const adminRole = await RoleModel.findOne({
      where: { name: 'admin' },
    })

    if (!adminRole) {
      return { errors: { message: 'Admin role not found' } }
    }

    const adminMapping = await VendorUserModel.findOne({
      where: {
        vendor_id: vendorId,
        role_id: adminRole.dataValues.public_id,
        status: 'ACTIVE',
      },
      include: [
        {
          model: UserModel,
          as: 'user',
          include: [{ model: RoleModel, as: 'role' }],
        },
      ],
    })

    if (!adminMapping) {
      return { errors: { message: 'Vendor admin not found' } }
    }

    return { doc: adminMapping.user }
  } catch (error) {
    console.log(error)
    return { errors: { message: 'failed to get vendor admin' } }
  }
}

module.exports = {
  userSignUp,
  findUserByEmailOrMobile,
  getTotalUsers,
  getUserById,
  updateUser,
  findUserByEmail,
  customerSignUp,
  updateUserProfile,
  createVendorAdmin,
  createVendorRider,
  getVendorRiders,
  getVendorAdmin,
}

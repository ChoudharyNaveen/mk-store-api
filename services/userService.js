const { v4: uuidV4 } = require('uuid');
const bcrypt = require('bcrypt');
const {
  user: UserModel,
  role: RoleModel,
  vendor: VendorModel,
  user_roles_mappings: UserRolesMappingModel,
  sequelize,
  Sequelize: { Op },
} = require('../database');

const saltRounds = 10;
const Helper = require('../utils/helper');
const { uploadFile } = require('../config/azure');

// Create Super Admin
const createSuperAdmin = async ({ data, imageFile }) => {
  let transaction = null;

  try {
    const {
      name,
      mobileNumber,
      email,
      password,
      confirmPassword,
      dateOfBirth,
      gender,
      status,
    } = data;

    // Check if user already exists
    const userExists = await UserModel.findOne({
      where: {
        [Op.or]: [ { email }, { mobile_number: mobileNumber } ],
      },
      attributes: [ 'id', 'name', 'mobile_number', 'email' ],
    });

    if (userExists) {
      return { errors: 'user already exists with that email or mobile number' };
    }

    if (password !== confirmPassword) {
      return { errors: 'password missmatched' };
    }

    transaction = await sequelize.transaction();
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Get or create SUPER_ADMIN role
    const superAdminRole = await RoleModel.findOne({
      where: { name: 'SUPER_ADMIN' },
    });

    if (!superAdminRole) {
      return { errors: 'Super admin role not found' };
    }

    const concurrencyStamp = uuidV4();
    const doc = {
      concurrency_stamp: concurrencyStamp,
      name,
      mobile_number: mobileNumber,
      email,
      password: hashedPassword,
      date_of_birth: dateOfBirth,
      gender,
      status: status || 'ACTIVE',
      profile_status: 'COMPLETE',
    };

    const user = await UserModel.create(doc, {
      transaction,
    });

    if (imageFile) {
      const blobName = `user-${user.id}-${Date.now()}.jpg`;
      const imageUrl = await uploadFile(imageFile, blobName);

      await UserModel.update({ image: imageUrl }, {
        where: { id: user.id },
        transaction,
      });
    }

    // Create mapping entry
    const mappingConcurrencyStamp = uuidV4();

    await UserRolesMappingModel.create(
      {
        user_id: user.id,
        role_id: superAdminRole.id,
        status: 'ACTIVE',
        concurrency_stamp: mappingConcurrencyStamp,
      },
      { transaction },
    );

    await transaction.commit();

    // Return only the created user data - use dataValues to avoid any association loading
    const userData = user.dataValues;

    return { doc: userData };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    console.log(error);

    return { errors: 'failed to create super admin' };
  }
};

// Find user by email
const findUserByEmail = async (payload) => {
  const { email } = payload;

  const response = await UserModel.findOne({
    where: {
      email,
    },
  });

  return response;
};

// Get user by ID
const getUserById = async (payload) => {
  const { id } = payload;

  const response = await UserModel.findOne({
    where: { id },
  });

  if (response) {
    const { dataValues } = response;
    const doc = Helper.convertSnakeToCamel(dataValues);

    return { doc };
  }

  return {};
};

// Create Vendor Admin
const createVendorAdmin = async ({ data, imageFile }) => {
  let transaction = null;

  try {
    const {
      vendorId, name, mobileNumber, email, password, ...otherData
    } = data;

    transaction = await sequelize.transaction();

    // Verify vendor exists
    const vendor = await VendorModel.findOne({
      where: { id: vendorId },
    });

    if (!vendor) {
      await transaction.rollback();

      return { errors: { message: 'Vendor not found' } };
    }

    // Get admin role
    const adminRole = await RoleModel.findOne({
      where: { name: 'VENDOR_ADMIN' },
    });

    if (!adminRole) {
      await transaction.rollback();

      return { errors: { message: 'Admin role not found' } };
    }

    // Check if vendor already has an admin in mapping table
    const existingAdmin = await UserRolesMappingModel.findOne({
      where: {
        vendor_id: vendorId,
        role_id: adminRole.id,
        status: 'ACTIVE',
      },
    });

    if (existingAdmin) {
      await transaction.rollback();

      return { errors: { message: 'Vendor already has an admin assigned' } };
    }

    // Check if user already exists
    const userExists = await UserModel.findOne({
      where: {
        [Op.or]: [ { email }, { mobile_number: mobileNumber } ],
      },
    });

    if (userExists) {
      await transaction.rollback();

      return {
        errors: { message: 'User already exists with that email or mobile number' },
      };
    }

    // Hash password if provided
    let hashedPassword = null;

    if (password) {
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    const concurrencyStamp = uuidV4();

    const doc = {
      concurrency_stamp: concurrencyStamp,
      name,
      mobile_number: mobileNumber,
      email,
      password: hashedPassword,
      profile_status: 'COMPLETE',
      ...otherData,
    };

    const user = await UserModel.create(doc, { transaction });

    if (imageFile) {
      const blobName = `user-${user.id}-${Date.now()}.jpg`;
      const imageUrl = await uploadFile(imageFile, blobName);

      await UserModel.update({ image: imageUrl }, {
        where: { id: user.id },
        transaction,
      });
    }

    // Create mapping entry
    const mappingConcurrencyStamp = uuidV4();

    await UserRolesMappingModel.create(
      {
        vendor_id: vendorId,
        user_id: user.id,
        role_id: adminRole.id,
        status: 'ACTIVE',
        concurrency_stamp: mappingConcurrencyStamp,
      },
      { transaction },
    );

    await transaction.commit();

    return { doc: { user } };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    console.log(error);

    return { errors: { message: 'failed to create vendor admin' } };
  }
};

// Update User
const updateUser = async ({ data, imageFile }) => {
  let transaction = null;
  const { id, password, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  try {
    transaction = await sequelize.transaction();
    const response = await UserModel.findOne({
      where: { id },
    });

    if (response) {
      const { concurrencyStamp: stamp } = response;

      if (concurrencyStamp === stamp) {
        const newConcurrencyStamp = uuidV4();
        const doc = {
          ...Helper.convertCamelToSnake(datas),
          updatedBy,
          profile_status: 'COMPLETE',
          concurrency_stamp: newConcurrencyStamp,
        };

        if (imageFile) {
          const blobName = `user-${id}-${Date.now()}.jpg`;
          const imageUrl = await uploadFile(imageFile, blobName);

          doc.image = imageUrl;
        }

        if (password) {
          const hashedPassword = await bcrypt.hash(password, saltRounds);

          doc.password = hashedPassword;
        }

        await UserModel.update(doc, {
          where: { id },
          transaction,
        });
        await transaction.commit();

        return { doc: { concurrencyStamp: newConcurrencyStamp } };
      }
      await transaction.rollback();

      return { concurrencyError: { message: 'invalid concurrency stamp' } };
    }

    return {};
  } catch (error) {
    console.log(error);
    if (transaction) {
      await transaction.rollback();
    }

    return { errors: { message: 'transaction failed' } };
  }
};

// Convert User to Rider
const convertUserToRider = async ({ userId }) => {
  let transaction = null;

  try {
    transaction = await sequelize.transaction();

    // Check if user exists
    const user = await UserModel.findOne({
      where: { id: userId },
    });

    if (!user) {
      await transaction.rollback();
      console.error(`[convertUserToRider] Error: User not found with userId: ${userId}`);

      return { errors: { message: 'User not found' } };
    }

    // Get RIDER role
    const riderRole = await RoleModel.findOne({
      where: { name: 'RIDER' },
    });

    if (!riderRole) {
      await transaction.rollback();
      console.error('[convertUserToRider] Error: RIDER role not found in database');

      return { errors: { message: 'RIDER role not found' } };
    }

    // Check if user already has RIDER role
    const existingRiderMapping = await UserRolesMappingModel.findOne({
      where: {
        user_id: userId,
        role_id: riderRole.id,
        status: 'ACTIVE',
      },
    });

    if (existingRiderMapping) {
      await transaction.rollback();
      console.error(`[convertUserToRider] Error: User ${userId} is already a rider`);

      return { errors: { message: 'User is already a rider' } };
    }

    // Find existing role mapping for the user
    const existingMapping = await UserRolesMappingModel.findOne({
      where: {
        user_id: userId,
        status: 'ACTIVE',
      },
    });

    if (!existingMapping) {
      await transaction.rollback();
      console.error(`[convertUserToRider] Error: No existing role mapping found for user ${userId}`);

      return { errors: { message: 'No existing role mapping found for user' } };
    }

    // Update existing mapping to RIDER role
    const mappingConcurrencyStamp = uuidV4();

    await UserRolesMappingModel.update(
      {
        role_id: riderRole.id,
        concurrency_stamp: mappingConcurrencyStamp,
      },
      {
        where: { id: existingMapping.id },
        transaction,
      },
    );

    // Fetch updated mapping
    const updatedMapping = await UserRolesMappingModel.findOne({
      where: { id: existingMapping.id },
      transaction,
    });

    await transaction.commit();

    return { doc: { message: 'User successfully converted to rider', mapping: updatedMapping } };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    console.error('[convertUserToRider] Error:', error);
    console.error('[convertUserToRider] Stack trace:', error.stack);

    return { errors: { message: 'Failed to convert user to rider' } };
  }
};

module.exports = {
  createSuperAdmin,
  findUserByEmail,
  getUserById,
  createVendorAdmin,
  updateUser,
  convertUserToRider,
};

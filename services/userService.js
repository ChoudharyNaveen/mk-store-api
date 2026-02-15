/* eslint-disable max-lines */
const { v4: uuidV4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  user: UserModel,
  role: RoleModel,
  vendor: VendorModel,
  user_roles_mappings: UserRolesMappingModel,
  sequelize,
  Sequelize: { Op },
} = require('../database');

const saltRounds = 10;
const {
  withTransaction,
  convertCamelToSnake,
  convertSnakeToCamel,
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  findAndCountAllWithTotal,
} = require('../utils/helper');
const { uploadUserFile } = require('../config/aws');
const { convertImageFieldsToCloudFront } = require('../utils/s3Helper');
const config = require('../config/index');
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  ConcurrencyError,
  handleServiceError,
} = require('../utils/serviceErrors');
const { ROLE } = require('../utils/constants/roleConstants');

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
      throw new ConflictError('user already exists with that email or mobile number');
    }

    if (password !== confirmPassword) {
      throw new ValidationError('password missmatched');
    }

    transaction = await sequelize.transaction();
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Get or create SUPER_ADMIN role
    const superAdminRole = await RoleModel.findOne({
      where: { name: ROLE.SUPER_ADMIN },
      attributes: [ 'id', 'name' ],
      transaction,
    });

    if (!superAdminRole) {
      throw new NotFoundError('Super admin role not found');
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
      const filename = `user-${user.id}-${Date.now()}.jpg`;
      const userId = user.id;

      const imageUrl = await uploadUserFile(imageFile, filename, userId);

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

    return handleServiceError(error, 'Failed to create super admin');
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
    attributes: [ 'id', 'name', 'mobile_number', 'email', 'date_of_birth', 'gender', 'status', 'profile_status', 'image', 'created_at', 'updated_at' ],
  });

  if (response) {
    const { dataValues } = response;
    const doc = convertSnakeToCamel(dataValues);

    // Convert image URL to CloudFront URL (automatically handles nested objects/arrays)
    const docWithCloudFrontUrl = convertImageFieldsToCloudFront(doc);

    return { doc: docWithCloudFrontUrl };
  }

  return handleServiceError(new NotFoundError('User not found'));
};

// Get user profile (includes role and vendor information)
const getUserProfile = async (payload) => {
  const { id } = payload;

  const user = await UserModel.findOne({
    where: { id },
    attributes: [ 'id', 'name', 'mobile_number', 'email', 'date_of_birth', 'gender', 'status', 'profile_status', 'image', 'created_at', 'updated_at', 'concurrency_stamp' ],
  });

  if (!user) {
    return handleServiceError(new NotFoundError('User not found'));
  }

  const userData = convertSnakeToCamel(user.dataValues);

  // Get role mappings and role information
  const roleMappings = await UserRolesMappingModel.findAll({
    where: {
      user_id: id,
      status: 'ACTIVE',
    },
    include: [
      {
        model: RoleModel,
        as: 'role',
      },
    ],
  });

  // Extract role and vendor information
  const roleMapping = roleMappings && roleMappings[0];
  const roleData = roleMapping && roleMapping.role
    ? convertSnakeToCamel(roleMapping.role.dataValues)
    : null;
  const mappingData = roleMapping
    ? convertSnakeToCamel(roleMapping.dataValues)
    : null;

  // Prepare user profile response
  const profile = {
    ...userData,
    roleName: roleData ? roleData.name : null,
    vendorId: mappingData ? mappingData.vendorId : null,
  };

  // Convert image URL to CloudFront URL (automatically handles nested objects/arrays)
  const profileWithCloudFrontUrl = convertImageFieldsToCloudFront(profile);

  return { doc: profileWithCloudFrontUrl };
};

// Create Vendor Admin
const createVendorAdmin = async ({ data, imageFile }) => {
  let transaction = null;

  try {
    const {
      vendorId, name, mobile_number: mobileNumber, email, password, ...otherData
    } = data;

    transaction = await sequelize.transaction();

    // Verify vendor exists and get admin role in parallel
    const [ vendor, adminRole ] = await Promise.all([
      VendorModel.findOne({
        where: { id: vendorId },
        attributes: [ 'id' ],
        transaction,
      }),
      RoleModel.findOne({
        where: { name: ROLE.VENDOR_ADMIN },
        attributes: [ 'id', 'name' ],
        transaction,
      }),
    ]);

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    if (!adminRole) {
      throw new NotFoundError('Admin role not found');
    }

    // Check if vendor already has an admin and if user exists in parallel
    const [ existingAdmin, userExists ] = await Promise.all([
      UserRolesMappingModel.findOne({
        where: {
          vendor_id: vendorId,
          role_id: adminRole.id,
          status: 'ACTIVE',
        },
        attributes: [ 'id' ],
        transaction,
      }),
      UserModel.findOne({
        where: {
          [Op.or]: [ { email }, { mobile_number: mobileNumber } ],
        },
        attributes: [ 'id' ],
        transaction,
      }),
    ]);

    if (existingAdmin) {
      throw new ConflictError('Vendor already has an admin assigned');
    }

    if (userExists) {
      throw new ConflictError('User already exists with that email or mobile number');
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
      const filename = `user-${user.id}-${Date.now()}.jpg`;
      const userId = user.id;

      const imageUrl = await uploadUserFile(imageFile, filename, userId);

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

    // Note: No notification for VENDOR_ADMIN creation
    // Notifications are only for regular USER registrations

    await transaction.commit();

    return { doc: { user } };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, 'Failed to create vendor admin');
  }
};

// Update User
const updateUser = async ({ data, imageFile }) => withTransaction(sequelize, async (transaction) => {
  const { id, password, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  const response = await UserModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp' ],
    transaction,
  });

  if (!response) {
    throw new NotFoundError('User not found');
  }

  const { concurrency_stamp: stamp } = response;

  if (concurrencyStamp !== stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
  }

  const newConcurrencyStamp = uuidV4();
  const doc = {
    ...convertCamelToSnake(datas),
    updated_by: updatedBy,
    profile_status: 'COMPLETE',
    concurrency_stamp: newConcurrencyStamp,
  };

  if (imageFile) {
    const filename = `user-${id}-${Date.now()}.jpg`;
    const userId = id;

    const imageUrl = await uploadUserFile(imageFile, filename, userId);

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

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => handleServiceError(error, 'Transaction failed'));

// Convert User to Rider or Rider to User (bidirectional)
const convertUserToRider = async ({ userId, targetRole }) => {
  let transaction = null;

  try {
    transaction = await sequelize.transaction();

    const isConvertingToRider = targetRole === ROLE.RIDER;

    // Fetch user, target role, current-role mapping, and active mapping in parallel
    const [ user, targetRoleRecord, existingTargetRoleMapping, existingMapping ] = await Promise.all([
      UserModel.findOne({
        where: { id: userId },
        attributes: [ 'id' ],
        transaction,
      }),
      RoleModel.findOne({
        where: { name: targetRole },
        attributes: [ 'id', 'name' ],
        transaction,
      }),
      UserRolesMappingModel.findOne({
        where: {
          user_id: userId,
          status: 'ACTIVE',
        },
        attributes: [ 'id', 'role_id' ],
        include: [ {
          model: RoleModel,
          as: 'role',
          attributes: [ 'id', 'name' ],
          where: { name: targetRole },
        } ],
        transaction,
      }),
      UserRolesMappingModel.findOne({
        where: {
          user_id: userId,
          status: 'ACTIVE',
        },
        attributes: [ 'id', 'user_id', 'role_id', 'concurrency_stamp' ],
        transaction,
      }),
    ]);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!targetRoleRecord) {
      throw new NotFoundError(`Role ${targetRole} not found`);
    }

    if (existingTargetRoleMapping) {
      throw new ConflictError(isConvertingToRider ? 'User is already a rider' : 'User is already a user');
    }

    if (!existingMapping) {
      throw new ValidationError('No existing role mapping found for user');
    }

    if (isConvertingToRider) {
      // No extra check: any non-rider can be converted to rider
    } else {
      // Converting rider to user: ensure current role is RIDER
      const currentRole = await RoleModel.findOne({
        where: { id: existingMapping.role_id },
        attributes: [ 'name' ],
        transaction,
      });

      if (!currentRole || currentRole.name !== ROLE.RIDER) {
        throw new ValidationError('User is not a rider; only riders can be converted back to user');
      }
    }

    const mappingConcurrencyStamp = uuidV4();

    await UserRolesMappingModel.update(
      {
        role_id: targetRoleRecord.id,
        concurrency_stamp: mappingConcurrencyStamp,
      },
      {
        where: { id: existingMapping.id },
        transaction,
      },
    );

    const updatedMapping = await UserRolesMappingModel.findOne({
      where: { id: existingMapping.id },
      attributes: [ 'id', 'user_id', 'role_id', 'vendor_id', 'status', 'concurrency_stamp', 'created_at', 'updated_at' ],
      transaction,
    });

    await transaction.commit();

    const message = isConvertingToRider
      ? 'User successfully converted to rider'
      : 'Rider successfully converted to user';

    return { doc: { message, mapping: updatedMapping } };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return handleServiceError(error, `Failed to convert user to ${targetRole}`);
  }
};

// Auth Login
const authLogin = async (payload) => {
  const { email, password } = payload;

  try {
    // Find user by email
    const user = await UserModel.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      return handleServiceError(new NotFoundError('User not found. Please sign up first.'));
    }

    const userData = convertSnakeToCamel(user.dataValues);

    // Check if user has password
    if (!userData.password) {
      return handleServiceError(new ValidationError('Invalid credentials'));
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, userData.password);

    if (!passwordMatch) {
      return handleServiceError(new ValidationError('Invalid credentials'));
    }

    // Get role mappings and role information
    const roleMappings = await UserRolesMappingModel.findAll({
      where: {
        user_id: userData.id,
        status: 'ACTIVE',
      },
      include: [
        {
          model: RoleModel,
          attributes: [ 'id', 'name' ],
          as: 'role',
        },
        {
          model: VendorModel,
          as: 'vendor',
          attributes: [ 'id', 'name' ],
          required: false,
        },
      ],
    });

    // Extract role and vendor information
    const roleMapping = roleMappings && roleMappings[0];
    const roleData = roleMapping && roleMapping.role
      ? convertSnakeToCamel(roleMapping.role.dataValues)
      : null;
    const mappingData = roleMapping
      ? convertSnakeToCamel(roleMapping.dataValues)
      : null;
    const vendorData = roleMapping && roleMapping.vendor
      ? convertSnakeToCamel(roleMapping.vendor.dataValues)
      : null;

    // Prepare user response
    const userResponse = {
      id: userData.id,
      name: userData.name || null,
      mobileNumber: userData.mobileNumber,
      email: userData.email || null,
      status: userData.status,
      profileStatus: userData.profileStatus,
      roleName: roleData ? roleData.name : null,
      vendorId: mappingData ? mappingData.vendorId : null,
      vendorName: vendorData ? vendorData.name : null,
    };

    // Generate JWT token
    const tokenSecret = config.jwt.token_secret;

    const token = jwt.sign(userResponse, tokenSecret, {
      expiresIn: config.jwt.token_life,
    });

    // No notification for login - notifications are only for user registration

    return {
      doc: {
        message: 'Login successful. User authenticated.',
        user: userResponse,
        token,
      },
    };
  } catch (error) {
    return handleServiceError(error, 'Failed to authenticate user');
  }
};

// Refresh Token
const refreshToken = async (payload) => {
  const { token } = payload;

  try {
    const tokenSecret = config.jwt.token_secret;

    // Verify token even if expired (ignoreExpiration: true)
    let decoded;

    try {
      decoded = jwt.verify(token, tokenSecret);
    } catch (error) {
      // If token is expired, try to decode without verification
      if (error.name === 'TokenExpiredError') {
        decoded = jwt.decode(token);

        if (!decoded) {
          return handleServiceError(new ValidationError('Invalid token'));
        }
      } else {
        return handleServiceError(new ValidationError('Invalid token'));
      }
    }

    // Verify user still exists and is active
    const user = await UserModel.findOne({
      where: {
        id: decoded.id,
        status: 'ACTIVE',
      },
      attributes: [ 'id', 'name', 'mobile_number', 'email', 'status', 'profile_status' ],
    });

    if (!user) {
      return handleServiceError(new NotFoundError('User not found or inactive'));
    }

    const userData = convertSnakeToCamel(user.dataValues);

    // Get role mappings and role information
    const roleMappings = await UserRolesMappingModel.findAll({
      where: {
        user_id: userData.id,
        status: 'ACTIVE',
      },
      include: [
        {
          model: RoleModel,
          as: 'role',
        },
      ],
    });

    // Extract role and vendor information
    const roleMapping = roleMappings && roleMappings[0];
    const roleData = roleMapping && roleMapping.role
      ? convertSnakeToCamel(roleMapping.role.dataValues)
      : null;
    const mappingData = roleMapping
      ? convertSnakeToCamel(roleMapping.dataValues)
      : null;

    // Prepare user response
    const userResponse = {
      id: userData.id,
      name: userData.name || null,
      mobileNumber: userData.mobileNumber,
      email: userData.email || null,
      status: userData.status,
      profileStatus: userData.profileStatus,
      roleName: roleData ? roleData.name : null,
      vendorId: mappingData ? mappingData.vendorId : null,
    };

    // Generate new JWT token
    const newToken = jwt.sign(userResponse, tokenSecret, {
      expiresIn: config.jwt.token_life,
    });

    return { doc: { token: newToken, user: userResponse } };
  } catch (error) {
    return handleServiceError(error, 'Failed to refresh token');
  }
};

// Get Users by vendor and role
const getUsers = async (payload) => {
  const {
    vendorId, roleName, pageSize, pageNumber, filters, sorting,
  } = payload;

  try {
    // Find role by name (from tab query param)
    let role = null;

    if (roleName) {
      role = await RoleModel.findOne({
        where: {
          name: roleName.toUpperCase(),
          status: 'ACTIVE',
        },
      });

      if (!role) {
        return handleServiceError(new NotFoundError(`Role with name '${roleName}' not found`));
      }
    }

    const { limit, offset } = calculatePagination(pageSize, pageNumber);

    const where = generateWhereCondition(filters);
    const order = sorting
      ? generateOrderCondition(sorting)
      : [ [ 'created_at', 'DESC' ] ];

    // Build mapping where clause to filter by vendor and role
    const mappingWhere = {
      vendor_id: vendorId,
      status: 'ACTIVE',
    };

    if (role) {
      mappingWhere.role_id = role.id;
    }

    // Find users with pagination and filters applied to UserModel
    const response = await findAndCountAllWithTotal(
      UserModel,
      {
        where,
        attributes: [ 'id', 'name', 'mobile_number', 'email', 'status', 'profile_status', 'image', 'created_at', 'updated_at', 'concurrency_stamp' ],
        include: [
          {
            model: UserRolesMappingModel,
            as: 'roleMappings',
            attributes: [],
            where: mappingWhere,
            required: true,
          },
        ],
        limit,
        offset,
        order,
        distinct: true,
      },
      pageNumber,
    );

    let doc = [];

    if (response) {
      const { count, totalCount, rows } = response;
      const dataValues = rows.map((user) => user.dataValues);
      const serializedData = JSON.parse(JSON.stringify(dataValues));
      const transformedUsers = serializedData.map((userData) => convertSnakeToCamel(userData));

      doc = convertImageFieldsToCloudFront(transformedUsers);

      return { count, totalCount, doc };
    }

    return { count: 0, totalCount: 0, doc: [] };
  } catch (error) {
    return handleServiceError(error, 'Failed to fetch users');
  }
};

module.exports = {
  createSuperAdmin,
  findUserByEmail,
  getUserById,
  getUserProfile,
  createVendorAdmin,
  updateUser,
  convertUserToRider,
  authLogin,
  refreshToken,
  getUsers,
};

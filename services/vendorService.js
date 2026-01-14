const { v4: uuidV4 } = require('uuid');
const {
  vendor: VendorModel,
  branch: BranchModel,
  user: UserModel,
  role: RoleModel,
  user_roles_mappings: UserRolesMappingModel,
  sequelize,
} = require('../database');
const {
  withTransaction,
  convertCamelToSnake,
  calculatePagination,
  generateWhereCondition,
  generateOrderCondition,
  findAndCountAllWithTotal,
} = require('../utils/helper');
const {
  NotFoundError,
  ConflictError,
  ConcurrencyError,
  handleServiceError,
} = require('../utils/serviceErrors');
const { ROLE } = require('../utils/constants/roleConstants');

const saveVendor = async ({ data }) => {
  let transaction = null;

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
    } = data;

    transaction = await sequelize.transaction();

    // Check if vendor code and branch code already exist in parallel
    const [ existingVendor, existingBranch ] = await Promise.all([
      code ? VendorModel.findOne({
        where: { code },
        attributes: [ 'id' ],
        transaction,
      }) : null,
      branchCode ? BranchModel.findOne({
        where: { code: branchCode },
        attributes: [ 'id' ],
        transaction,
      }) : null,
    ]);

    if (existingVendor) {
      throw new ConflictError('Vendor code already exists. Please use a different code.');
    }

    if (existingBranch) {
      throw new ConflictError('Branch code already exists. Please use a different code.');
    }

    const concurrencyStamp = uuidV4();

    const vendorDoc = {
      ...vendorDatas,
      code: code || null,
      concurrencyStamp,
      createdBy,
    };

    const vendor = await VendorModel.create(convertCamelToSnake(vendorDoc), {
      transaction,
    });

    // Create branch for the vendor
    const branchConcurrencyStamp = uuidV4();
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
    };

    const branch = await BranchModel.create(convertCamelToSnake(branchDoc), {
      transaction,
    });

    await transaction.commit();

    return { doc: { vendor, branch } };
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    // Handle unique constraint violation from database
    if (error.name === 'SequelizeUniqueConstraintError') {
      if (error.errors && error.errors.some((e) => e.path === 'code' && e.instance?.tableName === 'vendor')) {
        return handleServiceError(new ConflictError('Vendor code already exists. Please use a different code.'));
      }
      if (error.errors && error.errors.some((e) => e.path === 'code' && e.instance?.tableName === 'branch')) {
        return handleServiceError(new ConflictError('Branch code already exists. Please use a different code.'));
      }
      if (error.errors && error.errors.some((e) => e.path === 'email')) {
        return handleServiceError(new ConflictError('Vendor email already exists. Please use a different email.'));
      }
    }

    return handleServiceError(error, 'Failed to save vendor');
  }
};

const updateVendor = async ({ data }) => withTransaction(sequelize, async (transaction) => {
  const { id, ...datas } = data;
  const { concurrencyStamp, updatedBy } = datas;

  const response = await VendorModel.findOne({
    where: { id },
    attributes: [ 'id', 'concurrency_stamp' ],
    transaction,
  });

  if (!response) {
    throw new NotFoundError('Vendor not found');
  }

  const { concurrency_stamp: stamp } = response;

  if (concurrencyStamp !== stamp) {
    throw new ConcurrencyError('invalid concurrency stamp');
  }

  const newConcurrencyStamp = uuidV4();
  const doc = {
    ...convertCamelToSnake(data),
    updated_by: updatedBy,
    concurrency_stamp: newConcurrencyStamp,
  };

  await VendorModel.update(doc, {
    where: { id },
    transaction,
  });

  return { doc: { concurrencyStamp: newConcurrencyStamp } };
}).catch((error) => handleServiceError(error, 'Transaction failed'));

const getVendor = async (payload) => {
  const {
    pageSize, pageNumber, filters, sorting,
  } = payload;
  const { limit, offset } = calculatePagination(pageSize, pageNumber);

  const where = generateWhereCondition(filters);
  const order = sorting
    ? generateOrderCondition(sorting)
    : [ [ 'createdAt', 'DESC' ] ];

  const response = await findAndCountAllWithTotal(
    VendorModel,
    {
      where: { ...where },
      order,
      limit,
      offset,
    },
  );
  const doc = [];

  if (response) {
    const { count, totalCount, rows } = response;

    rows.map((element) => doc.push(element.dataValues));

    return { count, totalCount, doc };
  }

  return { count: 0, totalCount: 0, doc: [] };
};

const getVendorByCode = async (code) => {
  try {
    const vendor = await VendorModel.findOne({
      where: { code },
      attributes: [ 'id', 'name', 'email', 'code', 'status', 'created_at', 'updated_at' ],
    });

    if (!vendor) {
      return handleServiceError(new NotFoundError('Vendor not found'));
    }

    return { doc: vendor.dataValues };
  } catch (error) {
    return handleServiceError(error, 'Failed to get vendor by code');
  }
};

const getVendorWithUsers = async (vendorId) => {
  try {
    // Fetch roles in parallel
    const [ adminRole, riderRole ] = await Promise.all([
      RoleModel.findOne({
        where: { name: ROLE.VENDOR_ADMIN },
        attributes: [ 'id', 'name' ],
      }),
      RoleModel.findOne({
        where: { name: 'rider' },
        attributes: [ 'id', 'name' ],
      }),
    ]);

    if (!adminRole || !riderRole) {
      return handleServiceError(new NotFoundError('Roles not found'));
    }

    const vendor = await VendorModel.findOne({
      where: { id: vendorId },
      attributes: [ 'id', 'name', 'email', 'code', 'status', 'created_at', 'updated_at' ],
      include: [
        {
          model: UserRolesMappingModel,
          as: 'userRoleMappings',
          attributes: [ 'id', 'user_id', 'role_id', 'vendor_id', 'status' ],
          include: [
            {
              model: UserModel,
              as: 'user',
              attributes: [ 'id', 'name', 'mobile_number', 'email', 'status', 'profile_status', 'image' ],
            },
            {
              model: RoleModel,
              as: 'role',
              attributes: [ 'id', 'name' ],
            },
          ],
        },
      ],
    });

    if (!vendor) {
      return handleServiceError(new NotFoundError('Vendor not found'));
    }

    // Separate admin and riders
    const adminMapping = vendor.userRoleMappings.find(
      (urm) => urm.role_id === adminRole.id && urm.status === 'ACTIVE',
    );
    const riderMappings = vendor.userRoleMappings.filter(
      (urm) => urm.role_id === riderRole.id && urm.status === 'ACTIVE',
    );

    const result = {
      ...vendor.dataValues,
      admin: adminMapping ? adminMapping.user : null,
      riders: riderMappings.map((rm) => rm.user),
    };

    return { doc: result };
  } catch (error) {
    return handleServiceError(error, 'Failed to get vendor with users');
  }
};

module.exports = {
  saveVendor,
  updateVendor,
  getVendor,
  getVendorByCode,
  getVendorWithUsers,
};

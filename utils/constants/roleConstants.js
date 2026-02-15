const ROLE = {
  USER: 'USER',
  VENDOR_ADMIN: 'VENDOR_ADMIN',
  RIDER: 'RIDER',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

const ROLE_ENUM = Object.values(ROLE);

/**
 * Validate if a given role name is a valid role
 * @param {string} roleName
 * @returns {boolean}
 */
const isValidRole = (roleName) => ROLE_ENUM.includes(roleName);

/**
 * Check if a role is a vendor-related role
 * @param {string} roleName
 * @returns {boolean}
 */
const isVendorRole = (roleName) => roleName === ROLE.VENDOR_ADMIN;

module.exports = {
  ROLE,
  ROLE_ENUM,
  isValidRole,
  isVendorRole,
};

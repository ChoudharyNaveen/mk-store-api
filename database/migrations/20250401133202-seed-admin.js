const crypto = require('crypto')
const {role: RoleModel} = require('..')
module.exports = {
  up: async (queryInterface) => {
    const role = await RoleModel.findOne({
      where: { name: 'admin' },
    })
    if (!role) {
      throw new Error('Admin role not found')
    }

    const admin = [
      {
        public_id: crypto.randomUUID(),
        mobile_number: '1234567890',
        name: 'Admin',
        email: 'admin@gmail.com',
        password:
          '$2b$10$BIl64fW35wq6ibY9vORjy.k2Skx/02TG3c5gl2OffVFq408rWjAEu',
        role_id: role.dataValues.public_id,
        status: 'ACTIVE',
        concurrency_stamp: crypto.randomUUID(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    return queryInterface.bulkInsert('user', admin, {})
  },
  down: (queryInterface) => queryInterface.truncate('user', {}),
}

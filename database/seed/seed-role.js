const crypto = require('crypto')
const role = [
  {
    public_id: crypto.randomUUID(),
    name: 'SUPER_ADMIN',
    description: 'Super administrator with full system access',
    created_at: new Date(),
    updated_at: new Date(),
    concurrency_stamp: crypto.randomUUID(),
  },
  {
    public_id: crypto.randomUUID(),
    name: 'VENDOR_ADMIN',
    description: 'he has all the access',
    created_at: new Date(),
    updated_at: new Date(),
    concurrency_stamp: crypto.randomUUID(),
  },
  {
    public_id: crypto.randomUUID(),
    name: 'USER',
    description: 'he is the customer',
    created_at: new Date(),
    updated_at: new Date(),
    concurrency_stamp: crypto.randomUUID(),
  },
  {
    public_id: crypto.randomUUID(),
    name: 'RIDER',
    description: 'he is the rider ',
    created_at: new Date(),
    updated_at: new Date(),
    concurrency_stamp: crypto.randomUUID(),
  },
]

module.exports = role

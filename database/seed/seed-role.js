const crypto = require('crypto')
const role = [
  {
    public_id: crypto.randomUUID(),
    name: 'admin',
    description: 'he has all the access',
    created_at: new Date(),
    updated_at: new Date(),
    concurrency_stamp: crypto.randomUUID(),
  },
  {
    public_id: crypto.randomUUID(),
    name: 'user',
    description: 'he is the customer',
    created_at: new Date(),
    updated_at: new Date(),
    concurrency_stamp: crypto.randomUUID(),
  },
  {
    public_id: crypto.randomUUID(),
    name: 'rider',
    description: 'he is the rider ',
    created_at: new Date(),
    updated_at: new Date(),
    concurrency_stamp: crypto.randomUUID(),
  },
]

module.exports = role

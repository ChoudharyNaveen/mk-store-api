const crypto = require('crypto');
const users = [ {
  public_id : crypto.randomUUID(),
  mobile_number: '1234567890',
  name: 'Admin',
  email:"admin@gmail.com",
  password:"$2b$10$BIl64fW35wq6ibY9vORjy.k2Skx/02TG3c5gl2OffVFq408rWjAEu",
  status: "ACTIVE",
  concurrency_stamp: crypto.randomUUID(),
  created_at: new Date(),
  updated_at: new Date(),
}
 ];
module.exports = users;

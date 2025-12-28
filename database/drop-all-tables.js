const { sequelize } = require('./index');

async function dropAllTables() {
  try {
    console.log('Dropping all tables...');

    // Disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    const tables = [
      'orderItem',
      'order',
      'cart',
      'wishlist',
      'address',
      'otp',
      'product',
      'subCategory',
      'category',
      'offer',
      'promocode',
      'branch',
      'vendor',
      'user_roles_mappings',
      'vendor_user', // In case it still exists
      'user',
      'role',
    ];

    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS \`${table}\`;`);
        console.log(`✓ Dropped table: ${table}`);
      } catch (error) {
        console.log(`✗ Error dropping ${table}:`, error.message);
      }
    }

    // Also drop the SequelizeMeta table to reset migration state
    try {
      await sequelize.query('DROP TABLE IF EXISTS `SequelizeMeta`;');
      console.log('✓ Dropped SequelizeMeta table (migration history reset)');
    } catch (error) {
      console.log('Note: SequelizeMeta table may not exist');
    }

    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n✅ All tables dropped successfully!');
    console.log('You can now run: npm start (or npx sequelize-cli db:migrate) to recreate all tables');
  } catch (error) {
    console.error('Error dropping tables:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

dropAllTables();





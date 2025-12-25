// Seed migration - skipped (no data insertion needed)
module.exports = {
  up: async (queryInterface) => {
    // Skip seeding - tables only
    console.log('Skipping role seed data insertion')
  },
  down: async (queryInterface) => {
    // No-op
  },
}

const { connectDB, disconnectDB } = require('../config/db');
const Admin = require('../models/Admin');
const config = require('../config/config');

const seedAdmin = async () => {
  try {
    await connectDB();

    const existingAdminCount = await Admin.countDocuments();
    if (existingAdminCount > 0) {
      console.log('⚠️  An administrator account already exists. Strictly only ONE admin account is permitted.');
      const admin = await Admin.findOne().select('email role createdAt lastLoginAt');
      console.log(`Current Admin: ${admin.email}`);
      await disconnectDB();
      return;
    }

    const email = config.admin.email;
    const initialPassword = config.admin.initialPassword;

    if (!email || !initialPassword) {
      console.error('❌ Missing ADMIN_EMAIL or ADMIN_INITIAL_PASSWORD in environment config.');
      process.exit(1);
    }

    const admin = new Admin({
      email,
      passwordHash: initialPassword, // pre('save') hashes password automatically
      role: 'ADMIN',
    });

    await admin.save();

    console.log('====================================================');
    console.log('✅ Single Master Administrator Created Successfully!');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: [SET FROM ENVIRONMENT VARIABLE]`);
    console.log('====================================================');

    await disconnectDB();
  } catch (err) {
    console.error('❌ Error during admin seeding:', err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;

const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const res1 = await mongoose.connection.collection('registrations').updateOne(
    { registrationId: 'REG-2026-98GW4J' },
    { $set: { department: 'CS' } }
  );

  const res2 = await mongoose.connection.collection('registrations').updateOne(
    { registrationId: 'REG-2026-NMVBJE' },
    { $set: { department: 'BS' } }
  );

  console.log('Updated legacy records:', res1.modifiedCount, res2.modifiedCount);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');

const updateAdminPassword = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found in .env');
      process.exit(1);
    }

    console.log('[MLTify] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);

    const email = (process.env.ADMIN_EMAIL || 'admin@mltify.com').toLowerCase();
    const newPassword = process.env.ADMIN_PASSWORD || 'Admin@fahad07';

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name: 'MLTify Head Administrator',
        email,
        password: newPassword,
        role: 'admin',
      });
      await user.save();
      console.log(`[MLTify] ✅ Created admin account: ${email}`);
    } else {
      user.password = newPassword;
      await user.save();
      console.log(`[MLTify] ✅ Successfully updated password for ${email} to: ${newPassword}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('[MLTify] Error updating password:', err);
    process.exit(1);
  }
};

updateAdminPassword();


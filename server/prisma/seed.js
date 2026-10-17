import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from '../src/lib/prisma.js';

const accounts = [
  {
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    fullName: process.env.BOOTSTRAP_ADMIN_NAME || 'LIVYA Superadmin',
  },
  {
    email: process.env.BOOTSTRAP_ADMIN2_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN2_PASSWORD,
    fullName: process.env.BOOTSTRAP_ADMIN2_NAME || 'LIVYA Superadmin',
  },
].filter((account) => account.email || account.password);

if (!accounts.length) {
  console.error('Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD, and optionally BOOTSTRAP_ADMIN2_EMAIL and BOOTSTRAP_ADMIN2_PASSWORD.');
  process.exit(1);
}

for (const account of accounts) {
  if (!account.email || !account.password || account.password.length < 16) {
    console.error('Each configured bootstrap account needs an email and a unique password of at least 16 characters.');
    process.exit(1);
  }
  account.email = account.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) {
    console.error('A bootstrap account email is invalid.');
    process.exit(1);
  }
}
if (new Set(accounts.map((account) => account.email)).size !== accounts.length) {
  console.error('Bootstrap account emails must be unique.');
  process.exit(1);
}

try {
  for (const account of accounts) {
    const existing = await prisma.user.findUnique({ where: { email: account.email } });
    if (existing) {
      if (existing.role !== 'SUPERADMIN') {
        throw new Error(`Refusing to change existing non-superadmin account: ${account.email}`);
      }
      console.log(`Superadmin already exists; no changes made for ${account.email}.`);
      continue;
    }
    await prisma.user.create({
      data: {
        email: account.email,
        fullName: account.fullName,
        passwordHash: await bcrypt.hash(account.password, 12),
        role: 'SUPERADMIN',
      },
    });
    console.log(`Initial superadmin created for ${account.email}. Remove bootstrap secrets from the environment now.`);
  }
} finally {
  await prisma.$disconnect();
}

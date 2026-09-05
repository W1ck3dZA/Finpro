import "dotenv/config";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/services/auth.service";
import { env } from "../src/config/env";

async function main() {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    console.log(`Skipping seed: ${existingCount} user(s) already exist.`);
    return;
  }

  const passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);
  const admin = await prisma.user.create({
    data: {
      name: env.SEED_ADMIN_NAME,
      email: env.SEED_ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Created bootstrap admin account:");
  console.log(`  Email:    ${admin.email}`);
  console.log(`  Password: ${env.SEED_ADMIN_PASSWORD}`);
  console.log("Log in and create further staff accounts via Manage Users.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

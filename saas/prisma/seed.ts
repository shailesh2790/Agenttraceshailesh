import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Enable WAL mode for better concurrent write performance
  await prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;");

  // Demo user
  const hash = await bcrypt.hash("password123", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@agentrace.dev" },
    update: {},
    create: {
      email: "demo@agentrace.dev",
      passwordHash: hash,
      name: "Demo User",
    },
  });

  console.log(`Seeded demo user: ${user.email} / password123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

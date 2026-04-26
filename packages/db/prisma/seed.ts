import { PlanType, PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "test@devscope.ai" },
    update: {
      clerkId: "test_clerk_id",
      name: "Test User",
      plan: PlanType.FREE,
    },
    create: {
      clerkId: "test_clerk_id",
      email: "test@devscope.ai",
      name: "Test User",
      plan: PlanType.FREE,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import path from "node:path";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import { departmentData } from "./seed-data";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "[Seed Error] ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD environment variables must be set in your .env file before running seed.",
    );
  }

  const demoStaffPassword = process.env.DEMO_USERS_PASSWORD;
  if (!demoStaffPassword) {
    throw new Error(
      "[Seed Error] DEMO_USERS_PASSWORD environment variable must be set in your .env file before running seed.",
    );
  }

  console.log("🌱 Starting database seed...");

  // Hash passwords
  const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
  const staffHashedPassword = await bcrypt.hash(demoStaffPassword, 10);

  // 1. Create or update ADMIN user
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "System Administrator",
      role: Role.ADMIN,
      passwordHash: adminHashedPassword,
    },
    create: {
      name: "System Administrator",
      email: adminEmail,
      passwordHash: adminHashedPassword,
      role: Role.ADMIN,
    },
  });

  const createdAccounts: Array<{
    name: string;
    email: string;
    role: string;
    department: string;
  }> = [
    {
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      department: "N/A",
    },
  ];

  for (const deptDef of departmentData) {
    const department = await prisma.department.upsert({
      where: { name: deptDef.name },
      update: { description: deptDef.description },
      create: {
        name: deptDef.name,
        description: deptDef.description,
      },
    });

    for (const catDef of deptDef.categories) {
      await prisma.category.upsert({
        where: {
          name_departmentId: {
            name: catDef.name,
            departmentId: department.id,
          },
        },
        update: { description: catDef.description },
        create: {
          name: catDef.name,
          departmentId: department.id,
          description: catDef.description,
        },
      });
    }

    // Create Manager
    const mgrUser = await prisma.user.upsert({
      where: { email: deptDef.manager.email },
      update: {
        name: deptDef.manager.name,
        role: Role.MANAGER,
        departmentId: department.id,
        passwordHash: staffHashedPassword,
      },
      create: {
        name: deptDef.manager.name,
        email: deptDef.manager.email,
        passwordHash: staffHashedPassword,
        role: Role.MANAGER,
        departmentId: department.id,
      },
    });
    createdAccounts.push({
      name: mgrUser.name,
      email: mgrUser.email,
      role: mgrUser.role,
      department: department.name,
    });

    // Create Technicians
    for (const techDef of deptDef.technicians) {
      const techUser = await prisma.user.upsert({
        where: { email: techDef.email },
        update: {
          name: techDef.name,
          role: Role.TECHNICIAN,
          departmentId: department.id,
          passwordHash: staffHashedPassword,
        },
        create: {
          name: techDef.name,
          email: techDef.email,
          passwordHash: staffHashedPassword,
          role: Role.TECHNICIAN,
          departmentId: department.id,
        },
      });
      createdAccounts.push({
        name: techUser.name,
        email: techUser.email,
        role: techUser.role,
        department: department.name,
      });
    }
  }

  console.log("\n✅ Database seeding complete!");
  console.log(
    "ℹ️ Demo staff accounts password set to DEMO_USERS_PASSWORD env value\n",
  );
  console.table(createdAccounts);
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

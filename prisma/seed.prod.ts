import path from "node:path";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { BCRYPT_SALT_ROUNDS } from "../src/modules/auth/auth.service";
import { departmentData } from "./seed-data";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  let adminCreated = 0;
  let adminSkipped = 0;
  let departmentsCreated = 0;
  let departmentsSkipped = 0;
  let categoriesCreated = 0;
  let categoriesSkipped = 0;

  // 1. Admin verification / creation
  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: Role.ADMIN,
      deletedAt: null,
    },
  });

  if (existingAdmin) {
    adminSkipped++;
  } else {
    const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim();
    const adminPassword = process.env.ADMIN_SEED_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error(
        "[Seed Error] ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required when no ADMIN user exists.",
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      throw new Error(
        "[Seed Error] ADMIN_SEED_EMAIL is not a valid email format.",
      );
    }

    if (adminPassword.length < 10) {
      throw new Error(
        "[Seed Error] ADMIN_SEED_PASSWORD must be at least 10 characters long.",
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      console.warn(
        `[Seed Warning] User with email ${adminEmail} already exists with role ${existingUser.role}. Skipping admin creation without modifying user.`,
      );
      adminSkipped++;
    } else {
      const passwordHash = await bcrypt.hash(
        adminPassword,
        BCRYPT_SALT_ROUNDS || 12,
      );
      await prisma.user.create({
        data: {
          name: "System Administrator",
          email: adminEmail,
          passwordHash,
          role: Role.ADMIN,
        },
      });
      adminCreated++;
    }
  }

  // 2. Departments and Categories
  for (const deptDef of departmentData) {
    let department = await prisma.department.findUnique({
      where: { name: deptDef.name },
    });

    if (!department) {
      department = await prisma.department.create({
        data: {
          name: deptDef.name,
          description: deptDef.description,
        },
      });
      departmentsCreated++;
    } else {
      departmentsSkipped++;
    }

    for (const catDef of deptDef.categories) {
      const existingCat = await prisma.category.findUnique({
        where: {
          name_departmentId: {
            name: catDef.name,
            departmentId: department.id,
          },
        },
      });

      if (!existingCat) {
        await prisma.category.create({
          data: {
            name: catDef.name,
            departmentId: department.id,
            description: catDef.description,
            slaHours: catDef.slaHours ?? 72,
          },
        });
        categoriesCreated++;
      } else {
        categoriesSkipped++;
      }
    }
  }

  console.log(`[Production Seed Summary]
- Admin: ${adminCreated} created, ${adminSkipped} skipped
- Departments: ${departmentsCreated} created, ${departmentsSkipped} skipped
- Categories: ${categoriesCreated} created, ${categoriesSkipped} skipped`);
}

main()
  .catch((e) => {
    console.error("❌ Error during production seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

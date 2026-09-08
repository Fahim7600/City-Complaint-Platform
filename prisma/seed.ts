import path from "node:path";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

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

  const demoStaffPassword = process.env.DEMO_USERS_PASSWORD || "DemoStaff2026!";

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

  // 2. Sample Departments and Categories data
  const departmentData = [
    {
      name: "Roads & Infrastructure",
      description:
        "Handles road maintenance, streetlights, and traffic signals.",
      categories: [
        {
          name: "Pothole Repair",
          description: "Damaged or hazardous road potholes",
        },
        {
          name: "Streetlight Outage",
          description: "Non-functioning streetlights",
        },
        {
          name: "Traffic Signal Fault",
          description: "Malfunctioning traffic signals or signs",
        },
      ],
      manager: {
        name: "Sarah Connor (Roads Mgr)",
        email: "manager.roads@citycomplaints.com",
      },
      technicians: [
        { name: "John Tech (Roads)", email: "tech1.roads@citycomplaints.com" },
        { name: "Mike Tech (Roads)", email: "tech2.roads@citycomplaints.com" },
      ],
    },
    {
      name: "Water Supply & Sewage",
      description:
        "Manages water supply lines, pipe leaks, and drainage issues.",
      categories: [
        {
          name: "Pipe Leakage",
          description: "Main water pipe burst or leaking lines",
        },
        {
          name: "Low Water Pressure",
          description: "Persistent low pressure issues",
        },
        {
          name: "Sewage Blockage",
          description: "Blocked sewage or open manholes",
        },
      ],
      manager: {
        name: "Alex Mercer (Water Mgr)",
        email: "manager.water@citycomplaints.com",
      },
      technicians: [
        { name: "David Tech (Water)", email: "tech1.water@citycomplaints.com" },
        { name: "Emma Tech (Water)", email: "tech2.water@citycomplaints.com" },
      ],
    },
    {
      name: "Sanitation & Waste Management",
      description:
        "Oversees garbage collection, public cleanliness, and illegal dumping.",
      categories: [
        {
          name: "Uncollected Garbage",
          description: "Overdue residential or commercial waste collection",
        },
        {
          name: "Illegal Dumping",
          description: "Unauthorized dumping of hazardous/bulk waste",
        },
        {
          name: "Drain Blockage",
          description: "Clogged stormwater drains",
        },
      ],
      manager: {
        name: "Elena Vance (Sanitation Mgr)",
        email: "manager.sanitation@citycomplaints.com",
      },
      technicians: [
        {
          name: "Carlos Tech (Sanitation)",
          email: "tech1.sanitation@citycomplaints.com",
        },
        {
          name: "Lisa Tech (Sanitation)",
          email: "tech2.sanitation@citycomplaints.com",
        },
      ],
    },
  ];

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
    `ℹ️ Demo staff accounts password set to DEMO_USERS_PASSWORD env value (or default: "${demoStaffPassword}")\n`,
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

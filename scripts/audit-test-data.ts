import { Role } from "@prisma/client";
import { departmentData } from "../prisma/seed-data";
import { config } from "../src/config/env";
import { prisma } from "../src/config/prisma";

// Safe database connection info
const parsedDbUrl = new URL(config.DATABASE_URL);
const dbHost = parsedDbUrl.host;
const dbName = parsedDbUrl.pathname.replace(/^\//, "");

// Real seed definitions
const SEED_DEPARTMENT_NAMES = new Set(departmentData.map((d) => d.name));

const SEED_STAFF_EMAILS = new Set([
  ...departmentData.map((d) => d.manager.email.toLowerCase()),
  ...departmentData.flatMap((d) =>
    d.technicians.map((t) => t.email.toLowerCase()),
  ),
]);

interface UserAuditItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  counts: {
    complaintsFiled: number;
    complaintsAssigned: number;
    reviews: number;
    notifications: number;
    attachments: number;
    subscriptions: number;
    payments: number;
  };
  classification: "KEEP" | "TEST DATA" | "UNSURE";
  reason: string;
}

interface DeptAuditItem {
  id: string;
  name: string;
  isActive: boolean;
  categoriesCount: number;
  staffCount: number;
  complaintsCount: number;
  classification: "KEEP" | "TEST DATA" | "UNSURE";
  reason: string;
}

interface CategoryAuditItem {
  id: string;
  name: string;
  departmentName: string;
  departmentId: string;
  slaHours: number;
  isActive: boolean;
  complaintsCount: number;
  classification: "KEEP" | "TEST DATA" | "UNSURE";
  reason: string;
}

interface ComplaintAuditItem {
  id: string;
  title: string;
  citizenEmail: string;
  departmentName: string;
  categoryName: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  classification: "KEEP" | "TEST DATA" | "UNSURE";
  reason: string;
}

function isTestString(str: string): boolean {
  const s = str.toLowerCase();
  return (
    s.includes("test") ||
    s.includes("verification") ||
    s.includes("demo-test") ||
    s.includes("dummy") ||
    s.includes("mock") ||
    s.includes("cypress") ||
    s.includes("playwright") ||
    s.includes("jest")
  );
}

function isTestEmail(email: string): boolean {
  const e = email.toLowerCase();
  if (isTestString(e)) return true;
  if (
    e.endsWith("@example.com") ||
    e.endsWith("@test.com") ||
    e.endsWith("@mailinator.com") ||
    e.endsWith("@temp.com")
  ) {
    return true;
  }
  return false;
}

async function audit() {
  console.log(
    "===============================================================",
  );
  console.log(
    "       CITY COMPLAINT PLATFORM - DATABASE AUDIT (LIVE DB)      ",
  );
  console.log(
    "===============================================================",
  );
  console.log(`Connected to Database Host : ${dbHost}`);
  console.log(`Connected to Database Name : ${dbName}`);
  console.log(`Database Protocol          : ${parsedDbUrl.protocol}`);
  console.log(
    "===============================================================\n",
  );

  // 1. Audit Departments (Fetch ALL including soft-deleted)
  const departments = await prisma.department.findMany({
    include: {
      _count: {
        select: {
          categories: true,
          staff: true,
          complaints: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const deptAudit: DeptAuditItem[] = departments.map((d) => {
    const isSeed = SEED_DEPARTMENT_NAMES.has(d.name);
    let classification: "KEEP" | "TEST DATA" | "UNSURE" = "UNSURE";
    let reason = "";

    if (isSeed) {
      classification = "KEEP";
      reason = "Original seed department";
    } else if (isTestString(d.name)) {
      classification = "TEST DATA";
      reason = "Name indicates test entity";
    } else {
      classification = "TEST DATA";
      reason = "Non-seed department created during test runs";
    }

    return {
      id: d.id,
      name: d.name,
      isActive: d.deletedAt === null,
      categoriesCount: d._count.categories,
      staffCount: d._count.staff,
      complaintsCount: d._count.complaints,
      classification,
      reason,
    };
  });

  // 2. Audit Categories (Fetch ALL including soft-deleted)
  const categories = await prisma.category.findMany({
    include: {
      department: { select: { id: true, name: true } },
      _count: {
        select: {
          complaints: true,
        },
      },
    },
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
  });

  const categoryAudit: CategoryAuditItem[] = categories.map((c) => {
    const isSeedDept = SEED_DEPARTMENT_NAMES.has(c.department.name);
    let classification: "KEEP" | "TEST DATA" | "UNSURE" = "UNSURE";
    let reason = "";

    if (isSeedDept && !isTestString(c.name)) {
      classification = "KEEP";
      reason = `Real category in ${c.department.name}`;
    } else if (isTestString(c.name) || !isSeedDept) {
      classification = "TEST DATA";
      reason = isTestString(c.name)
        ? "Category name contains test keywords"
        : "Belongs to test department";
    } else {
      classification = "UNSURE";
      reason = "Custom category in seed department";
    }

    return {
      id: c.id,
      name: c.name,
      departmentName: c.department.name,
      departmentId: c.department.id,
      slaHours: c.slaHours,
      isActive: c.deletedAt === null,
      complaintsCount: c._count.complaints,
      classification,
      reason,
    };
  });

  // 3. Audit Users (Fetch ALL)
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          complaintsFiled: true,
          complaintsAssigned: true,
          reviewsGiven: true,
          reviewsReceived: true,
          notifications: true,
          attachmentsUploaded: true,
          payments: true,
        },
      },
      subscription: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const userAudit: UserAuditItem[] = users.map((u) => {
    const emailLower = u.email.toLowerCase();
    const isSeedStaff = SEED_STAFF_EMAILS.has(emailLower);
    const isOfficialAdmin =
      u.role === Role.ADMIN && emailLower === "admin@citycomplaints.com";
    const isPersonalUser = emailLower === "arfanahmedfahim832@gmail.com";

    let classification: "KEEP" | "TEST DATA" | "UNSURE" = "UNSURE";
    let reason = "";

    if (isOfficialAdmin) {
      classification = "KEEP";
      reason =
        "Official System Administrator account (admin@citycomplaints.com)";
    } else if (isSeedStaff) {
      classification = "KEEP";
      reason = "Original seeded department staff";
    } else if (isPersonalUser) {
      classification = "KEEP";
      reason = "Primary personal citizen account (keep untouched)";
    } else if (emailLower === "test-admin@test.com") {
      classification = "TEST DATA";
      reason = "Test administrator account (must be soft-deleted)";
    } else if (isTestString(u.name) || isTestEmail(u.email)) {
      classification = "TEST DATA";
      reason = isTestString(u.name)
        ? "Name indicates test user"
        : "Email matches test/throwaway pattern";
    } else {
      classification = "UNSURE";
      reason = "Citizen/user created outside original seed";
    }

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.deletedAt === null,
      createdAt: u.createdAt.toISOString().slice(0, 10),
      counts: {
        complaintsFiled: u._count.complaintsFiled,
        complaintsAssigned: u._count.complaintsAssigned,
        reviews: u._count.reviewsGiven + u._count.reviewsReceived,
        notifications: u._count.notifications,
        attachments: u._count.attachmentsUploaded,
        subscriptions: u.subscription ? 1 : 0,
        payments: u._count.payments,
      },
      classification,
      reason,
    };
  });

  const userClassificationMap = new Map<
    string,
    "KEEP" | "TEST DATA" | "UNSURE"
  >();
  for (const u of userAudit) {
    userClassificationMap.set(u.id, u.classification);
  }

  // 4. Audit Complaints (Fetch ALL)
  const complaints = await prisma.complaint.findMany({
    include: {
      citizen: { select: { email: true, name: true } },
      department: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const complaintAudit: ComplaintAuditItem[] = complaints.map((c) => {
    const userClass = userClassificationMap.get(c.citizenId);
    const isTestTitle =
      isTestString(c.title) || isTestString(c.description || "");
    const isNonSeedDept = !SEED_DEPARTMENT_NAMES.has(c.department.name);

    let classification: "KEEP" | "TEST DATA" | "UNSURE" = "UNSURE";
    let reason = "";

    if (userClass === "TEST DATA" || isTestTitle || isNonSeedDept) {
      classification = "TEST DATA";
      if (isTestTitle) reason = "Title/description has test keywords";
      else if (isNonSeedDept) reason = "Belongs to test department";
      else reason = "Filed by test user";
    } else {
      classification = "UNSURE";
      reason = "Needs review (non-test citizen or seed department)";
    }

    return {
      id: c.id,
      title: c.title,
      citizenEmail: c.citizen.email,
      departmentName: c.department.name,
      categoryName: c.category.name,
      status: c.status,
      isActive: c.deletedAt === null,
      createdAt: c.createdAt.toISOString().slice(0, 10),
      classification,
      reason,
    };
  });

  // PRINT DETAILED GROUP BREAKDOWNS
  console.log(">>> GROUP 1: KEEP (ORIGINAL SEED DATA & REAL ACCOUNTS)");
  console.log(
    "---------------------------------------------------------------",
  );
  console.log("Departments to KEEP:");
  for (const d of deptAudit.filter((x) => x.classification === "KEEP")) {
    console.log(
      `  - [Dept] "${d.name}" (ID: ${d.id}) | Active: ${d.isActive} | Cats: ${d.categoriesCount}, Staff: ${d.staffCount}, Complaints: ${d.complaintsCount}`,
    );
  }

  console.log("\nCategories to KEEP (with slaHours):");
  for (const c of categoryAudit.filter((x) => x.classification === "KEEP")) {
    console.log(
      `  - [Category] "${c.name}" in "${c.departmentName}" (ID: ${c.id}, DeptID: ${c.departmentId}) | slaHours: ${c.slaHours} | Active: ${c.isActive} | Complaints: ${c.complaintsCount}`,
    );
  }

  console.log("\nUsers to KEEP:");
  for (const u of userAudit.filter((x) => x.classification === "KEEP")) {
    console.log(
      `  - [${u.role}] "${u.name}" (${u.email}) (ID: ${u.id}) | Active: ${u.isActive} | Complaints: ${u.counts.complaintsFiled}f / ${u.counts.complaintsAssigned}a`,
    );
  }

  console.log("\n>>> GROUP 2: TEST DATA (CANDIDATES FOR SOFT-DELETE)");
  console.log(
    "---------------------------------------------------------------",
  );
  console.log("Test Departments to SOFT-DELETE:");
  for (const d of deptAudit.filter((x) => x.classification === "TEST DATA")) {
    console.log(
      `  - [Dept] "${d.name}" (ID: ${d.id}) | Active: ${d.isActive} | Cats: ${d.categoriesCount}, Staff: ${d.staffCount}, Complaints: ${d.complaintsCount} | Reason: ${d.reason}`,
    );
  }

  console.log("\nTest Categories to SOFT-DELETE:");
  for (const c of categoryAudit.filter(
    (x) => x.classification === "TEST DATA",
  )) {
    console.log(
      `  - [Category] "${c.name}" in "${c.departmentName}" (ID: ${c.id}) | slaHours: ${c.slaHours} | Active: ${c.isActive} | Complaints: ${c.complaintsCount} | Reason: ${c.reason}`,
    );
  }

  console.log("\nTest Users to SOFT-DELETE:");
  for (const u of userAudit.filter((x) => x.classification === "TEST DATA")) {
    console.log(
      `  - [${u.role}] "${u.name}" (${u.email}) (ID: ${u.id}) | Active: ${u.isActive} | Complaints: ${u.counts.complaintsFiled} filed, ${u.counts.complaintsAssigned} assigned | Reason: ${u.reason}`,
    );
  }

  console.log("\nTest Complaints to SOFT-DELETE:");
  for (const c of complaintAudit.filter(
    (x) => x.classification === "TEST DATA",
  )) {
    console.log(
      `  - [Complaint] "${c.title}" (ID: ${c.id}) | Status: ${c.status} | Citizen: ${c.citizenEmail} | Dept: ${c.departmentName} | Active: ${c.isActive} | Reason: ${c.reason}`,
    );
  }

  console.log("\n>>> GROUP 3: UNSURE (NEEDS DECISION / REVIEW)");
  console.log(
    "---------------------------------------------------------------",
  );
  const unsureDepts = deptAudit.filter((x) => x.classification === "UNSURE");
  const unsureCats = categoryAudit.filter((x) => x.classification === "UNSURE");
  const unsureUsers = userAudit.filter((x) => x.classification === "UNSURE");
  const unsureComplaints = complaintAudit.filter(
    (x) => x.classification === "UNSURE",
  );

  if (
    unsureDepts.length === 0 &&
    unsureCats.length === 0 &&
    unsureUsers.length === 0 &&
    unsureComplaints.length === 0
  ) {
    console.log("  None. All items were clearly identified.");
  } else {
    for (const d of unsureDepts) {
      console.log(`  - [Dept] "${d.name}" (ID: ${d.id}) | Reason: ${d.reason}`);
    }
    for (const c of unsureCats) {
      console.log(
        `  - [Category] "${c.name}" in "${c.departmentName}" (ID: ${c.id}) | Reason: ${c.reason}`,
      );
    }
    for (const u of unsureUsers) {
      console.log(
        `  - [${u.role}] "${u.name}" (${u.email}) (ID: ${u.id}) | Reason: ${u.reason}`,
      );
    }
    for (const c of unsureComplaints) {
      console.log(
        `  - [Complaint] "${c.title}" (ID: ${c.id}) | Citizen: ${c.citizenEmail} | Reason: ${c.reason}`,
      );
    }
  }

  // GROUP BREAKDOWN SUMMARY
  console.log(
    "\n===============================================================",
  );
  console.log(
    "                    SUMMARY BY CLASSIFICATION                  ",
  );
  console.log(
    "===============================================================",
  );

  const printGroupSummary = (group: "KEEP" | "TEST DATA" | "UNSURE") => {
    const dCount = deptAudit.filter((x) => x.classification === group).length;
    const catCount = categoryAudit.filter(
      (x) => x.classification === group,
    ).length;
    const uCount = userAudit.filter((x) => x.classification === group).length;
    const cCount = complaintAudit.filter(
      (x) => x.classification === group,
    ).length;
    console.log(`--- [${group}] ---`);
    console.log(`Departments : ${dCount}`);
    console.log(`Categories  : ${catCount}`);
    console.log(`Users       : ${uCount}`);
    console.log(`Complaints  : ${cCount}\n`);
  };

  printGroupSummary("KEEP");
  printGroupSummary("TEST DATA");
  printGroupSummary("UNSURE");

  // PHASE 2 ACTIONS PROPOSAL
  const deptsToSoftDelete = deptAudit.filter(
    (x) => x.classification === "TEST DATA" && x.isActive,
  );
  const catsToSoftDelete = categoryAudit.filter(
    (x) => x.classification === "TEST DATA" && x.isActive,
  );
  const usersToSoftDelete = userAudit.filter(
    (x) => x.classification === "TEST DATA" && x.isActive,
  );
  const complaintsToSoftDelete = complaintAudit.filter(
    (x) => x.classification === "TEST DATA" && x.isActive,
  );

  console.log(
    "===============================================================",
  );
  console.log("             PROPOSED PHASE 2 CLEANUP (SOFT-DELETE)           ");
  console.log(
    "===============================================================",
  );
  console.log(
    `If approved, Phase 2 will soft-delete (deletedAt = now()):
- ${deptsToSoftDelete.length} active Test Departments (and their associated categories)
- ${catsToSoftDelete.length} active Test Categories
- ${usersToSoftDelete.length} active Test Users (including test-admin@test.com)
- ${complaintsToSoftDelete.length} active Test Complaints

Rows will NOT be hard deleted from the database.
Original seed data (${deptAudit.filter((x) => x.classification === "KEEP").length} depts, ${categoryAudit.filter((x) => x.classification === "KEEP").length} categories, ${userAudit.filter((x) => x.classification === "KEEP").length} users) will remain 100% untouched.
===============================================================\n`,
  );
}

audit()
  .catch((err) => {
    console.error("Audit error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

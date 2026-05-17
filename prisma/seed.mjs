import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const roleCodes = ["OWNER", "HEAD_AUDIT", "AUDITOR", "INVESTIGATOR", "AUDITEE", "ADMIN"];

const permissionCodes = [
  "dashboard.read",
  "audit.read",
  "audit.execute",
  "findings.read",
  "findings.manage",
  "wbs.read",
  "investigation.read",
  "risk.read",
  "compliance.read",
  "followup.read",
  "users.manage",
  "settings.manage",
];

const rolePermissions = {
  OWNER: permissionCodes,
  ADMIN: ["dashboard.read", "users.manage", "settings.manage"],
  HEAD_AUDIT: ["dashboard.read", "audit.read", "findings.read", "risk.read", "compliance.read", "followup.read"],
  AUDITOR: ["dashboard.read", "audit.read", "audit.execute", "findings.read", "findings.manage", "followup.read"],
  INVESTIGATOR: ["dashboard.read", "wbs.read", "investigation.read", "risk.read"],
  AUDITEE: ["dashboard.read", "followup.read"],
};

async function seedRoles() {
  for (const code of roleCodes) {
    await prisma.role.upsert({
      where: { code },
      update: { name: code.replace("_", " ") },
      create: { code, name: code.replace("_", " ") },
    });
  }
}

async function seedPermissions() {
  for (const code of permissionCodes) {
    await prisma.permission.upsert({
      where: { code },
      update: { name: code },
      create: { code, name: code },
    });
  }
}

async function seedRolePermissions() {
  const roles = await prisma.role.findMany();
  const permissions = await prisma.permission.findMany();
  const permissionByCode = new Map(permissions.map((p) => [p.code, p.id]));
  const roleByCode = new Map(roles.map((r) => [r.code, r.id]));

  for (const [roleCode, permCodes] of Object.entries(rolePermissions)) {
    const roleId = roleByCode.get(roleCode);
    if (!roleId) continue;
    for (const permCode of permCodes) {
      const permissionId = permissionByCode.get(permCode);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }
}

async function main() {
  await seedRoles();
  await seedPermissions();
  await seedRolePermissions();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

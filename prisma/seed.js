// prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // --- กำหนดค่า Super Admin ของคุณที่นี่ ---
  const username = "admin";
  const plainPassword = "admin"; // <--- ตั้งรหัสผ่านที่ปลอดภัยที่นี่
  // -----------------------------------------

  console.log(`Checking for existing user: ${username}...`);
  const existingUser = await prisma.user.findUnique({
    where: { username: username },
  });

  if (existingUser) {
    console.log(`User '${username}' already exists. Seeding skipped.`);
    return;
  }

  console.log(`Creating Super Admin user: ${username}`);
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const superAdmin = await prisma.user.create({
    data: {
      username: username,
      // คุณสามารถใส่ email เริ่มต้นได้เช่นกัน
      email: "admin@example.com", 
      name: "Super Administrator",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      accountStatus: "ACTIVE",
    },
  });

  console.log("Super Admin created successfully:", superAdmin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
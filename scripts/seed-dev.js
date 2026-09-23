if (process.env.NODE_ENV === 'production') {
  throw new Error('Development seed is disabled in production.');
}
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding development test data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Owner
  const owner = await prisma.user.upsert({
    where: { username: 'owner' },
    update: {},
    create: {
      username: 'owner',
      firstName: 'Главный',
      lastName: 'Администратор',
      role: 'OWNER',
      passwordHash,
    },
  });

  // 2. Leader
  const leader = await prisma.user.upsert({
    where: { username: 'leader' },
    update: {},
    create: {
      username: 'leader',
      firstName: 'Анна',
      lastName: 'Старостина',
      role: 'LEADER',
      passwordHash,
    },
  });

  // 3. Students
  const s1 = await prisma.user.upsert({
    where: { username: 'student1' },
    update: {},
    create: {
      username: 'student1',
      firstName: 'Дмитрий',
      lastName: 'Ковалёв',
      role: 'STUDENT',
      passwordHash,
    },
  });

  const s2 = await prisma.user.upsert({
    where: { username: 'student2' },
    update: {},
    create: {
      username: 'student2',
      firstName: 'Елена',
      lastName: 'Морозова',
      role: 'STUDENT',
      passwordHash,
    },
  });

  console.log('Dev test accounts created with password: password123');
  console.log('- @owner (OWNER)');
  console.log('- @leader (LEADER)');
  console.log('- @student1 (STUDENT)');
  console.log('- @student2 (STUDENT)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


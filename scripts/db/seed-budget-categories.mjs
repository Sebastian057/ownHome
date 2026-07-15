import { PrismaClient } from '@prisma/client';
import {
  assertLocalDatabaseEnv,
  loadEnvFile,
  resolveFromRepo,
} from './env-utils.mjs';

const envFilePath = process.argv[2] ?? resolveFromRepo('.env.prisma.local');

loadEnvFile(envFilePath);
assertLocalDatabaseEnv({
  databaseUrl: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
});

const prisma = new PrismaClient({
  log: ['error'],
});

const categories = [
  ['dziecko', 'Dziecko'],
  ['firma', 'Firma'],
  ['kredyt_i_raty', 'Kredyt i raty'],
  ['oszczednosci', 'Oszczędności'],
  ['prezenty', 'Prezenty'],
  ['rachunki', 'Rachunki'],
  ['rozrywka', 'Rozrywka'],
  ['transport', 'Transport'],
  ['ubezpieczenie', 'Ubezpieczenie'],
  ['wycieczki', 'Wycieczki'],
  ['wydatki_osobiste', 'Wydatki osobiste'],
  ['wyposazenie_domu', 'Wyposażenie domu'],
  ['zdrowie', 'Zdrowie'],
  ['zywnosc', 'Żywność'],
].map(([slug, label], index) => ({
  slug,
  label,
  color: '#6b7280',
  sortOrder: index,
  isSystem: true,
  isActive: true,
}));

try {
  const result = await prisma.budgetCategory.createMany({
    data: categories,
    skipDuplicates: true,
  });

  console.log(`Seeded budget categories. Created ${result.count} new records.`);
} finally {
  await prisma.$disconnect();
}
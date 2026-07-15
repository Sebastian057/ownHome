import { PrismaClient } from '@prisma/client';
import {
  assertLocalDatabaseEnv,
  assertProductionDatabaseEnv,
  fileExists,
  parseEnvFile,
  resolveFromRepo,
} from './env-utils.mjs';

function createClient(url) {
  return new PrismaClient({
    datasources: {
      db: { url },
    },
  });
}

function mapUserId(items, targetUserId) {
  return items.map((item) => ({ ...item, userId: targetUserId }));
}

function removeFields(record, fields) {
  const next = { ...record };

  for (const field of fields) {
    delete next[field];
  }

  return next;
}

function keepKnownDate(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

async function resolveTargetUserId(localPrisma) {
  const explicit = process.env.DEMO_TARGET_USER_ID?.trim();

  if (explicit) {
    const profile = await localPrisma.userProfile.findUnique({
      where: { userId: explicit },
      select: { userId: true },
    });

    if (!profile) {
      throw new Error(`DEMO_TARGET_USER_ID was provided but not found in local user_profiles: ${explicit}`);
    }

    return explicit;
  }

  const latestProfile = await localPrisma.userProfile.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { userId: true },
  });

  if (!latestProfile) {
    throw new Error(
      'No local user profile found. Create one local user first in Supabase Studio (Auth -> Users).'
    );
  }

  return latestProfile.userId;
}

async function resolveSourceUserId(prodPrisma) {
  const explicit = process.env.DEMO_SOURCE_USER_ID?.trim();

  if (explicit) {
    return explicit;
  }

  const candidates = [
    await prodPrisma.budgetPeriod.groupBy({
      by: ['userId'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 1,
    }),
    await prodPrisma.vehicle.groupBy({
      by: ['userId'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 1,
    }),
    await prodPrisma.subscription.groupBy({
      by: ['userId'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 1,
    }),
  ];

  for (const candidate of candidates) {
    if (candidate.length > 0) {
      return candidate[0].userId;
    }
  }

  throw new Error(
    'Could not auto-pick production source user. Set DEMO_SOURCE_USER_ID in environment and run again.'
  );
}

async function main() {
  const localEnvPath = resolveFromRepo('.env.prisma.local');
  const prodEnvPath = resolveFromRepo('.env.prisma.prod');

  if (!fileExists(prodEnvPath)) {
    throw new Error(
      'Missing .env.prisma.prod. Copy .env.prisma.prod.example to .env.prisma.prod and fill production read credentials first.'
    );
  }

  const localEnv = parseEnvFile(localEnvPath);
  const prodEnv = parseEnvFile(prodEnvPath);

  assertLocalDatabaseEnv({
    databaseUrl: localEnv.DATABASE_URL,
    directUrl: localEnv.DIRECT_URL,
  });

  assertProductionDatabaseEnv({
    databaseUrl: prodEnv.DATABASE_URL,
    directUrl: prodEnv.DIRECT_URL,
    expectedDatabaseHost: prodEnv.EXPECTED_DATABASE_HOST,
    expectedDirectHost: prodEnv.EXPECTED_DIRECT_HOST,
  });

  const localPrisma = createClient(localEnv.DIRECT_URL || localEnv.DATABASE_URL);
  const prodPrisma = createClient(prodEnv.DIRECT_URL || prodEnv.DATABASE_URL);

  try {
    const sourceUserId = await resolveSourceUserId(prodPrisma);
    const targetUserId = await resolveTargetUserId(localPrisma);

    console.log(`Source production user: ${sourceUserId}`);
    console.log(`Target local user: ${targetUserId}`);

    const budgetCategories = await prodPrisma.budgetCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const budgetTemplates = await prodPrisma.budgetTemplate.findMany({
      where: { userId: sourceUserId },
      orderBy: { createdAt: 'asc' },
    });
    const budgetTemplateIds = budgetTemplates.map((item) => item.id);

    const budgetTemplateIncomes =
      budgetTemplateIds.length > 0
        ? await prodPrisma.budgetTemplateIncome.findMany({
            where: { templateId: { in: budgetTemplateIds } },
            orderBy: [{ templateId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          })
        : [];

    const budgetTemplateExpenses =
      budgetTemplateIds.length > 0
        ? await prodPrisma.budgetTemplateExpense.findMany({
            where: { templateId: { in: budgetTemplateIds } },
            orderBy: [{ templateId: 'asc' }, { category: 'asc' }],
          })
        : [];

    const budgetPeriods = await prodPrisma.budgetPeriod.findMany({
      where: { userId: sourceUserId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }, { createdAt: 'asc' }],
    });
    const budgetPeriodIds = budgetPeriods.map((item) => item.id);

    const budgetIncomes =
      budgetPeriodIds.length > 0
        ? await prodPrisma.budgetIncome.findMany({
            where: { periodId: { in: budgetPeriodIds } },
            orderBy: [{ periodId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          })
        : [];

    const budgetCategoryPlans =
      budgetPeriodIds.length > 0
        ? await prodPrisma.budgetCategoryPlan.findMany({
            where: { periodId: { in: budgetPeriodIds } },
            orderBy: [{ periodId: 'asc' }, { category: 'asc' }],
          })
        : [];

    const transactions =
      budgetPeriodIds.length > 0
        ? await prodPrisma.transaction.findMany({
            where: { periodId: { in: budgetPeriodIds } },
            orderBy: [{ periodId: 'asc' }, { createdAt: 'asc' }],
          })
        : [];

    const subscriptions = await prodPrisma.subscription.findMany({
      where: { userId: sourceUserId },
      orderBy: { createdAt: 'asc' },
    });

    const recurringTemplates = await prodPrisma.recurringTemplate.findMany({
      where: { userId: sourceUserId },
      orderBy: { createdAt: 'asc' },
    });
    const recurringTemplateIds = recurringTemplates.map((item) => item.id);

    const recurringPayments =
      recurringTemplateIds.length > 0
        ? await prodPrisma.recurringPayment.findMany({
            where: { templateId: { in: recurringTemplateIds } },
            orderBy: [{ year: 'asc' }, { month: 'asc' }, { createdAt: 'asc' }],
          })
        : [];

    const vehicles = await prodPrisma.vehicle.findMany({
      where: { userId: sourceUserId },
      orderBy: { createdAt: 'asc' },
    });
    const vehicleIds = vehicles.map((item) => item.id);

    const vehicleInsurances =
      vehicleIds.length > 0
        ? await prodPrisma.vehicleInsurance.findMany({
            where: { vehicleId: { in: vehicleIds } },
            orderBy: { createdAt: 'asc' },
          })
        : [];

    const vehicleInspections =
      vehicleIds.length > 0
        ? await prodPrisma.vehicleInspection.findMany({
            where: { vehicleId: { in: vehicleIds } },
            orderBy: { createdAt: 'asc' },
          })
        : [];

    const vehicleServiceVisits =
      vehicleIds.length > 0
        ? await prodPrisma.vehicleServiceVisit.findMany({
            where: { vehicleId: { in: vehicleIds } },
            orderBy: { createdAt: 'asc' },
          })
        : [];
    const vehicleServiceVisitIds = vehicleServiceVisits.map((item) => item.id);

    const vehicleMaintenanceItems =
      vehicleIds.length > 0
        ? await prodPrisma.vehicleMaintenanceItem.findMany({
            where: { vehicleId: { in: vehicleIds } },
            orderBy: { createdAt: 'asc' },
          })
        : [];

    const vehicleServiceVisitFiles =
      vehicleServiceVisitIds.length > 0
        ? await prodPrisma.vehicleServiceVisitFile.findMany({
            where: { visitId: { in: vehicleServiceVisitIds } },
            orderBy: { createdAt: 'asc' },
          })
        : [];

    const vehicleMaintenanceLogs =
      vehicleIds.length > 0
        ? await prodPrisma.vehicleMaintenanceLog.findMany({
            where: { vehicleId: { in: vehicleIds } },
            orderBy: { createdAt: 'asc' },
          })
        : [];

    const meterReadings = await prodPrisma.meterReading.findMany({
      where: { userId: sourceUserId },
      orderBy: [{ type: 'asc' }, { readingDate: 'asc' }, { createdAt: 'asc' }],
    });

    // Clear local data first (user/auth tables intentionally untouched).
    await localPrisma.vehicleServiceVisitFile.deleteMany();
    await localPrisma.vehicleMaintenanceLog.deleteMany();
    await localPrisma.vehicleMaintenanceItem.deleteMany();
    await localPrisma.vehicleServiceVisit.deleteMany();
    await localPrisma.vehicleInspection.deleteMany();
    await localPrisma.vehicleInsurance.deleteMany();
    await localPrisma.vehicle.deleteMany();

    await localPrisma.recurringPayment.deleteMany();
    await localPrisma.recurringTemplate.deleteMany();

    await localPrisma.transaction.deleteMany();
    await localPrisma.budgetCategoryPlan.deleteMany();
    await localPrisma.budgetIncome.deleteMany();
    await localPrisma.budgetPeriod.deleteMany();
    await localPrisma.budgetTemplateExpense.deleteMany();
    await localPrisma.budgetTemplateIncome.deleteMany();
    await localPrisma.budgetTemplate.deleteMany();

    await localPrisma.subscription.deleteMany();
    await localPrisma.meterReading.deleteMany();
    await localPrisma.scheduledEvent.deleteMany();
    await localPrisma.budgetCategory.deleteMany();

    if (budgetCategories.length > 0) {
      await localPrisma.budgetCategory.createMany({
        data: budgetCategories,
      });
    }

    if (budgetTemplates.length > 0) {
      await localPrisma.budgetTemplate.createMany({
        data: mapUserId(budgetTemplates, targetUserId),
      });
    }

    if (budgetTemplateIncomes.length > 0) {
      await localPrisma.budgetTemplateIncome.createMany({
        data: mapUserId(budgetTemplateIncomes, targetUserId),
      });
    }

    if (budgetTemplateExpenses.length > 0) {
      await localPrisma.budgetTemplateExpense.createMany({
        data: mapUserId(budgetTemplateExpenses, targetUserId),
      });
    }

    if (budgetPeriods.length > 0) {
      await localPrisma.budgetPeriod.createMany({
        data: mapUserId(budgetPeriods, targetUserId),
      });
    }

    if (budgetIncomes.length > 0) {
      await localPrisma.budgetIncome.createMany({
        data: mapUserId(budgetIncomes, targetUserId),
      });
    }

    if (budgetCategoryPlans.length > 0) {
      await localPrisma.budgetCategoryPlan.createMany({
        data: mapUserId(budgetCategoryPlans, targetUserId),
      });
    }

    if (transactions.length > 0) {
      await localPrisma.transaction.createMany({
        data: mapUserId(transactions, targetUserId),
      });
    }

    if (subscriptions.length > 0) {
      await localPrisma.subscription.createMany({
        data: mapUserId(subscriptions, targetUserId),
      });
    }

    if (recurringTemplates.length > 0) {
      await localPrisma.recurringTemplate.createMany({
        data: mapUserId(recurringTemplates, targetUserId),
      });
    }

    if (recurringPayments.length > 0) {
      await localPrisma.recurringPayment.createMany({
        data: mapUserId(recurringPayments, targetUserId),
      });
    }

    if (vehicles.length > 0) {
      await localPrisma.vehicle.createMany({
        data: mapUserId(vehicles, targetUserId).map((item) => ({
          ...item,
          registrationExpiry: keepKnownDate(item.registrationExpiry),
          deletedAt: keepKnownDate(item.deletedAt),
          createdAt: keepKnownDate(item.createdAt),
          updatedAt: keepKnownDate(item.updatedAt),
        })),
      });
    }

    if (vehicleInsurances.length > 0) {
      await localPrisma.vehicleInsurance.createMany({
        data: mapUserId(vehicleInsurances, targetUserId),
      });
    }

    if (vehicleInspections.length > 0) {
      await localPrisma.vehicleInspection.createMany({
        data: mapUserId(vehicleInspections, targetUserId),
      });
    }

    if (vehicleServiceVisits.length > 0) {
      await localPrisma.vehicleServiceVisit.createMany({
        data: mapUserId(vehicleServiceVisits, targetUserId),
      });
    }

    if (vehicleMaintenanceItems.length > 0) {
      await localPrisma.vehicleMaintenanceItem.createMany({
        data: mapUserId(vehicleMaintenanceItems, targetUserId),
      });
    }

    if (vehicleServiceVisitFiles.length > 0) {
      await localPrisma.vehicleServiceVisitFile.createMany({
        data: mapUserId(vehicleServiceVisitFiles, targetUserId),
      });
    }

    if (vehicleMaintenanceLogs.length > 0) {
      await localPrisma.vehicleMaintenanceLog.createMany({
        data: mapUserId(vehicleMaintenanceLogs, targetUserId),
      });
    }

    if (meterReadings.length > 0) {
      await localPrisma.meterReading.createMany({
        data: mapUserId(
          meterReadings.map((item) => removeFields(item, ['deletedAt'])),
          targetUserId
        ).map((item, index) => ({
          ...item,
          deletedAt: meterReadings[index].deletedAt,
        })),
      });
    }

    console.log('Demo data import completed. Summary:');
    console.table({
      budgetCategories: budgetCategories.length,
      budgetTemplates: budgetTemplates.length,
      budgetTemplateIncomes: budgetTemplateIncomes.length,
      budgetTemplateExpenses: budgetTemplateExpenses.length,
      budgetPeriods: budgetPeriods.length,
      budgetIncomes: budgetIncomes.length,
      budgetCategoryPlans: budgetCategoryPlans.length,
      transactions: transactions.length,
      subscriptions: subscriptions.length,
      recurringTemplates: recurringTemplates.length,
      recurringPayments: recurringPayments.length,
      vehicles: vehicles.length,
      vehicleInsurances: vehicleInsurances.length,
      vehicleInspections: vehicleInspections.length,
      vehicleServiceVisits: vehicleServiceVisits.length,
      vehicleMaintenanceItems: vehicleMaintenanceItems.length,
      vehicleServiceVisitFiles: vehicleServiceVisitFiles.length,
      vehicleMaintenanceLogs: vehicleMaintenanceLogs.length,
      meterReadings: meterReadings.length,
    });
  } finally {
    await prodPrisma.$disconnect();
    await localPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
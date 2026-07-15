const attemptedCommand = process.argv.slice(2).join(' ') || 'prisma migrate dev';

console.error(
  [
    `Blocked: \`${attemptedCommand}\` is not baseline-safe in this repository today.`,
    'Reason: the historical `prisma/migrations` folder does not contain a complete fresh-db chain.',
    'Use `npm run db:local:sync` for non-destructive local syncs or `npm run db:local:reset` for a full rebuild.',
    'Repair or squash migration history before relying on fresh-environment Prisma migration replay locally again.',
  ].join('\n')
);

process.exit(1);
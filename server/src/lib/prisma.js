import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__livyaPrisma ?? new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['warn','error'] : ['error'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.__livyaPrisma = prisma;
export default prisma;

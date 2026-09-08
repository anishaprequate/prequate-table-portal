import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prequatePrisma: PrismaClient | undefined;
}

export const prisma = global.__prequatePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prequatePrisma = prisma;
}

export * from "@prisma/client";

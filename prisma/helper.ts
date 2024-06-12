import { PrismaClient } from "@prisma/client";

export default async function createSignalData(
  count = 10,
  callback: (prisma: PrismaClient) => Promise<void>,
) {
  const prisma = new PrismaClient();
  for (let i = 1; i <= count; i++) {
    await callback(prisma);
  }
}
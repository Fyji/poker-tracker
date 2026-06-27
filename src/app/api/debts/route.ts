import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const debts = await prisma.debt.findMany({
    where: { paid: false },
    orderBy: { amount: "desc" },
  });

  return NextResponse.json(debts);
}

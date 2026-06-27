import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const debt = await prisma.debt.findUnique({ where: { id } });

  if (!debt) {
    return NextResponse.json({ error: "Debt not found" }, { status: 404 });
  }

  if (debt.paid) {
    return NextResponse.json({ error: "Already paid" }, { status: 400 });
  }

  const updated = await prisma.debt.update({
    where: { id },
    data: { paid: true, paidAt: new Date() },
  });

  return NextResponse.json(updated);
}

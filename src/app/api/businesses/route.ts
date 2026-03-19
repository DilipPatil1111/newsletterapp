import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { DEFAULT_BUSINESSES } from "@/lib/businesses";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ businesses: DEFAULT_BUSINESSES });
}

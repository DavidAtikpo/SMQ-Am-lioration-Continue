import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/admin-require";
import { callSmqAi } from "@/lib/ai";
import { buildSmqContext, getSmqData } from "@/lib/smq-context";
import type { AiRequest } from "@/lib/types";

export async function POST(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  try {
    const body = (await request.json()) as AiRequest;
    const data = await getSmqData();
    const context = buildSmqContext(data);
    const text = await callSmqAi(body, context);
    return NextResponse.json({ text });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la génération IA" },
      { status: 500 },
    );
  }
}

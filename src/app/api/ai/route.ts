import { NextResponse } from "next/server";
import { callSmqAi } from "@/lib/ai";
import { buildSmqContext, getSmqData } from "@/lib/smq-context";
import type { AiRequest } from "@/lib/types";

export async function POST(request: Request) {
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

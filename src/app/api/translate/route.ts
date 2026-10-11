import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/admin-require";
import { parseSmqLocale } from "@/lib/smq-i18n";
import { translateSmqPlainTexts } from "@/lib/smq-translate-text";

export async function POST(request: Request) {
  const denied = await assertAdminApi();
  if (denied) return denied;

  try {
    const body = (await request.json()) as { texts?: unknown; locale?: unknown };
    const locale = parseSmqLocale(body.locale);
    const raw = body.texts;
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: "texts[] requis" }, { status: 400 });
    }
    const texts = raw.map((t) => (typeof t === "string" ? t : String(t ?? "")));
    const translated = await translateSmqPlainTexts(texts, locale);
    return NextResponse.json({ texts: translated });
  } catch (error) {
    console.error("SMQ translate:", error);
    return NextResponse.json({ error: "Traduction impossible" }, { status: 500 });
  }
}

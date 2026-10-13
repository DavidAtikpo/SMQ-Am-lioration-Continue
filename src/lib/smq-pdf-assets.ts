import fs from "fs";
import path from "path";

export function resolveSmqLogoAsset(): { dataUrl: string; format: "PNG" | "JPEG" } | null {
  const candidates = [
    path.join(process.cwd(), "public", "logo-cides.png"),
    path.join(process.cwd(), "..", "irata", "public", "logo-cides.png"),
  ];

  for (const logoPath of candidates) {
    if (!fs.existsSync(/* turbopackIgnore: true */ logoPath)) continue;
    const buffer = fs.readFileSync(/* turbopackIgnore: true */ logoPath);
    return {
      dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
      format: "PNG",
    };
  }
  return null;
}

export function smqPlanningQrTargetUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "https://cides.tf";
  return `${base}/planification`;
}

import { NextResponse } from "next/server";
import { fetchAgendaGanttData } from "@/lib/agenda/gantt-data";
import { assertAdminApi } from "@/lib/admin-require";

export async function GET() {
  const denied = await assertAdminApi();
  if (denied) return denied;

  try {
    const data = await fetchAgendaGanttData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur récupération Gantt Agenda:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de récupérer les données Agenda",
      },
      { status: 500 },
    );
  }
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const SERVICES_DEFAUT = [
    "Direction",
    "Qualité",
    "Comptabilité",
    "Recouvrement",
    "Accueil",
    "Technique",
    "Logistique / Approvisionnement",
    "Commercial",
    "RH",
  ];

  for (const name of SERVICES_DEFAUT) {
    await prisma.service.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

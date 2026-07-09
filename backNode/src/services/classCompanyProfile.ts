import { prisma } from "../../prisma/singletonPrisma.js";

export type CompanyProfileDTO = {
  siren: string | null;
  name: string | null;
  statusJuridique: string | null;
  address: {
    address: string | null;
    codePostal: string | null;
    pays: string | null;
  } | null;
};

export class CompanyProfileService {
  static async get(userId: number): Promise<CompanyProfileDTO | null> {
    const enterprise = await prisma.enterprise.findUnique({
      where: { userId },
      select: {
        siren: true,
        name: true,
        statusJuridique: true,
        address: {
          select: {
            address: true,
            codePostal: true,
            pays: true,
          },
        },
      },
    });
    return enterprise;
  }
}

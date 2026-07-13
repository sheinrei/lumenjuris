import { prisma } from "../../prisma/singletonPrisma.js";

export type FolderDTO = {
  externalId: string;
  name: string;
  createdAt: Date;
  parentId: number | null;
};

export class FolderService {
  static async list(userId: number): Promise<FolderDTO[]> {
    return await prisma.folder.findMany({
      where: { userId },
      select: {
        externalId: true,
        name: true,
        createdAt: true,
        parentId: true,
      },
    });
  }
}

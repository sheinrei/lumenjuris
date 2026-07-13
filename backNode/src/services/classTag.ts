import { prisma } from "../../prisma/singletonPrisma.js";

export type TagDTO = {
  externalId: string;
  label: string;
  color: string;
};

export class TagService {
  static async list(userId: number): Promise<TagDTO[]> {
    return await prisma.tag.findMany({
      where: { userId },
      select: {
        externalId: true,
        label: true,
        color: true,
      },
    });
  }
}

import { Request, Response, NextFunction } from "express";
import { prisma } from "../../prisma/singletonPrisma.js";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  req.idUser = userId;
  req.role = (req.headers["x-user-role"] as string) || "USER";

  try {
    const user = await prisma.user.findUnique({
      where: { idUser: Number(userId) },
      select: { isBanned: true },
    });
    if (user?.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Votre compte a été suspendu. Contactez l'administrateur.",
        banned: true,
      });
    }
  } catch (err) {
    console.error("[authMiddleware] ban check error:", err);
  }

  next();
}

export function authMiddlewareAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  void authMiddleware(req, res, () => {
    if (req.role !== "ADMIN") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    next();
  });
}

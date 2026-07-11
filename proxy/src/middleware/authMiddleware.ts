import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

interface AuthPayload extends JwtPayload {
  userId: number;
  role: string;
}

export function proxyAuthMiddleware( req: Request, res: Response, next: NextFunction): void {
  // Cookie (front web) ou header Authorization: Bearer (complément Word,
  // où le cookie httpOnly cross-site n'est pas transmis par le navigateur).
  const cookieToken: string | undefined = (
    req as Request & { cookies: Record<string, string> }
  ).cookies?.authLumenJuris;



  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;
  const token = cookieToken ?? bearerToken;

  if (!token) {
    // Mode dev local : laisser passer sans token (POC complément Word).
    // En production, le comportement reste inchangé (401).
    if (process.env.NODE_ENV !== "production") {
      next();
      return;
    }
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    console.log(payload)
    res.locals.userId = payload.userId;
    res.locals.role = payload.role ?? "USER";

    const refreshed = jwt.sign(
      { userId: payload.userId, role: res.locals.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );
    res.cookie("authLumenJuris", refreshed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    next();
  } catch {
    res
      .status(401)
      .json({ success: false, message: "Token invalide ou expiré" });
  }
}

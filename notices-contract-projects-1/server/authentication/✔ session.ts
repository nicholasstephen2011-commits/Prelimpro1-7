import { db } from "../db";
import { verifyToken } from "../utils/jwt";

export async function session(token: string) {
  const payload = verifyToken(token);
  if (!payload) return null;

  return db.user.findUnique({ where: { id: payload.userId } });
}
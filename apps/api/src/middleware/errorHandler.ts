import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { NextFunction, Request, Response } from "express";

const isProd = process.env.NODE_ENV === "production";

function httpStatusFromError(err: unknown): number | null {
  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    return (err as { status: number }).status;
  }
  return null;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof PrismaClientKnownRequestError) {
    const prismaErr = err;
    if (prismaErr.code === "P2002") {
      res.status(409).json({
        error: "A record with this value already exists.",
        code: prismaErr.code,
      });
      return;
    }
    if (prismaErr.code === "P2025") {
      res.status(404).json({
        error: "Record not found.",
        code: prismaErr.code,
      });
      return;
    }
  }

  const explicitStatus = httpStatusFromError(err);
  if (explicitStatus === 400) {
    const message =
      err instanceof Error ? err.message : "Invalid request";
    res.status(400).json({ error: message });
    return;
  }

  const statusCode =
    explicitStatus !== null && explicitStatus >= 400 && explicitStatus < 600
      ? explicitStatus
      : 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  const publicMessage =
    err instanceof Error ? err.message : "Internal Server Error";

  if (statusCode >= 500 && isProd) {
    res.status(statusCode).json({ error: "Internal Server Error" });
    return;
  }

  res.status(statusCode).json({ error: publicMessage });
}

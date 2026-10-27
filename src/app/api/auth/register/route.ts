import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { handleRoute } from "@/lib/handleRoute";
import { AppError } from "@/domain/errors/AppError";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const { name, email, password } = await req.json().catch(() => ({}));

    if (!email || !password) {
      throw AppError.invalidInput("Email and password are required");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "A user with this email already exists" } },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  });
}

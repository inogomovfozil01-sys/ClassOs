import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { generateSmartUsername, isValidLatinName } from "@/lib/username-ai";
import { syncTableMembers } from "@/lib/table-members";
import { logAuditEvent } from "@/lib/audit";

const DEFAULT_TEMP_PASSWORD = "maktabim180";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, chosenUsername } = body;

    if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
      return NextResponse.json(
        { error: "Пожалуйста, введите имя и фамилию" },
        { status: 400 },
      );
    }

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();

    if (!isValidLatinName(cleanFirst) || !isValidLatinName(cleanLast)) {
      return NextResponse.json(
        {
          error:
            "Имя и фамилия должны быть написаны только английскими буквами (латиницей, например: Shakhzod Bakhodirov)",
        },
        { status: 400 },
      );
    }

    let finalUsername = chosenUsername?.trim()?.toLowerCase();

    // If username not provided or taken, generate smart unique username with AI
    if (!finalUsername) {
      const generated = await generateSmartUsername(cleanFirst, cleanLast);
      finalUsername = generated.username;
    } else {
      const existing = await prisma.user.findUnique({
        where: { username: finalUsername },
      });
      if (existing) {
        const generated = await generateSmartUsername(cleanFirst, cleanLast);
        finalUsername = generated.username;
      }
    }

    const passwordHash = await hashPassword(DEFAULT_TEMP_PASSWORD);

    const newUser = await prisma.user.create({
      data: {
        firstName: cleanFirst,
        lastName: cleanLast,
        username: finalUsername,
        passwordHash,
        role: "STUDENT",
        mustChangePassword: false,
      },
    });

    // Sync to custom table rows
    try {
      await syncTableMembers();
    } catch (e) {
      console.warn("Table members sync warning:", e);
    }

    // Auto-add new student to General Class Chat
    try {
      const classChat = await prisma.conversation.findFirst({
        where: { type: "CLASS" },
      });
      if (classChat) {
        await prisma.conversationMember.create({
          data: {
            conversationId: classChat.id,
            userId: newUser.id,
          },
        });
      }
    } catch (e) {
      console.warn("Class chat auto-join warning:", e);
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    // Create session so student is automatically logged in
    const { token, expiresAt } = await createSession(
      newUser.id,
      userAgent,
      ipAddress,
    );

    await logAuditEvent({
      userId: newUser.id,
      action: "USER_REGISTERED_VIA_INVITE",
      entity: "USER",
      entityId: newUser.id,
      details: { username: newUser.username, role: newUser.role },
      ipAddress,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
      },
      tempPassword: DEFAULT_TEMP_PASSWORD,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error: any) {
    console.error("Quick join error:", error);
    return NextResponse.json(
      { error: error?.message || "Ошибка создания аккаунта" },
      { status: 500 },
    );
  }
}

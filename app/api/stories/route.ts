import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

interface StoryData {
  id: string;
  userId: string;
  authorName: string;
  authorRole?: string;
  avatarUrl?: string | null;
  mediaUrl?: string;
  mediaType?: "video" | "image";
  gradient: string;
  text?: string;
  sticker?: string;
  createdAt: string;
  viewsCount: number;
}

const SETTING_KEY = "class_stories";
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function getStoredStories(): Promise<StoryData[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    if (!setting?.value) return [];
    const parsed = JSON.parse(setting.value);
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    // Filter only valid stories within 24h
    return parsed.filter(
      (s: StoryData) =>
        s &&
        s.createdAt &&
        now - new Date(s.createdAt).getTime() < TWENTY_FOUR_HOURS_MS,
    );
  } catch (err) {
    console.error("Error reading stored stories:", err);
    return [];
  }
}

async function saveStoredStories(stories: StoryData[]) {
  const jsonValue = JSON.stringify(stories);
  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: jsonValue },
    create: { key: SETTING_KEY, value: jsonValue },
  });
}

export async function GET() {
  try {
    const stories = await getStoredStories();

    // Group stories by userId
    const groupMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        userRole?: string;
        avatarUrl?: string | null;
        hasUnseen: boolean;
        stories: StoryData[];
      }
    >();

    for (const story of stories) {
      if (!groupMap.has(story.userId)) {
        groupMap.set(story.userId, {
          userId: story.userId,
          userName: story.authorName,
          userRole: story.authorRole,
          avatarUrl: story.avatarUrl,
          hasUnseen: true,
          stories: [],
        });
      }
      groupMap.get(story.userId)!.stories.push(story);
    }

    const groups = Array.from(groupMap.values());
    return NextResponse.json({ groups, stories });
  } catch (error: any) {
    console.error("GET /api/stories error:", error);
    return NextResponse.json({ groups: [], stories: [] });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await req.json();
    const { text, gradient, sticker, mediaUrl, mediaType } = body;

    if (!text?.trim() && !mediaUrl) {
      return NextResponse.json(
        { error: "Текст или медиа (фото/видео) обязательно" },
        { status: 400 },
      );
    }

    const currentStories = await getStoredStories();

    // Determine mediaType if not explicitly passed
    let resolvedMediaType = mediaType;
    if (!resolvedMediaType && mediaUrl) {
      if (
        mediaUrl.startsWith("data:video") ||
        mediaUrl.endsWith(".mp4") ||
        mediaUrl.endsWith(".webm") ||
        mediaUrl.endsWith(".mov")
      ) {
        resolvedMediaType = "video";
      } else {
        resolvedMediaType = "image";
      }
    }

    const newStory: StoryData = {
      id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: user.id,
      authorName: `${user.firstName} ${user.lastName}`.trim(),
      authorRole:
        user.role === "LEADER"
          ? "Лидер класса"
          : user.role === "TEACHER"
          ? "Учитель"
          : "Ученик 7-«А»",
      avatarUrl: user.avatarUrl,
      mediaUrl: mediaUrl || undefined,
      mediaType: resolvedMediaType || undefined,
      gradient: gradient || "from-orange-500 via-rose-500 to-purple-600",
      text: text?.trim() || undefined,
      sticker: sticker || undefined,
      createdAt: new Date().toISOString(),
      viewsCount: 1,
    };

    const updatedStories = [newStory, ...currentStories];
    await saveStoredStories(updatedStories);

    return NextResponse.json({ success: true, story: newStory });
  } catch (error: any) {
    console.error("POST /api/stories error:", error);
    return NextResponse.json(
      { error: "Не удалось сохранить историю" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get("id");

    if (!storyId) {
      return NextResponse.json({ error: "ID истории не указан" }, { status: 400 });
    }

    const currentStories = await getStoredStories();
    const storyToDelete = currentStories.find((s) => s.id === storyId);

    if (!storyToDelete) {
      return NextResponse.json({ error: "История не найдена" }, { status: 404 });
    }

    // Only owner of story or ADMIN/OWNER can delete
    const isOwner = storyToDelete.userId === user.id;
    const isPrivileged = ["OWNER", "ADMIN"].includes(user.role);

    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: "Нет прав для удаления" }, { status: 403 });
    }

    const filtered = currentStories.filter((s) => s.id !== storyId);
    await saveStoredStories(filtered);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/stories error:", error);
    return NextResponse.json(
      { error: "Не удалось удалить историю" },
      { status: 500 },
    );
  }
}

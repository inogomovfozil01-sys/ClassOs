import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { avatarKey } from "@/lib/avatar";
import { readStoredFile } from "@/lib/storage";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getCurrentUser()))
    return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { avatarUrl: true, isBlocked: true },
  });
  const key = avatarKey(user?.avatarUrl, id);
  if (!key || user?.isBlocked || new URL(req.url).searchParams.get("v") !== key)
    return new Response("Not found", { status: 404 });
  const data = await readStoredFile(key);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

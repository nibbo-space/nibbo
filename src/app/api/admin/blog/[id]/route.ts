import { isUserAdmin } from "@/lib/admin";
import { isAllowedBlogCoverUrl } from "@/lib/blog-cover-url";
import { isValidBlogSlug, slugify } from "@/lib/blog-slug";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isUserAdmin(session.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const b = body as Record<string, unknown>;

  const titleUk = typeof b.titleUk === "string" ? b.titleUk.trim() : "";
  const titleEn = typeof b.titleEn === "string" ? b.titleEn.trim() : "";
  const bodyUk = typeof b.bodyUk === "string" ? b.bodyUk : "";
  const bodyEn = typeof b.bodyEn === "string" ? b.bodyEn : "";
  if (!titleUk || !titleEn) return NextResponse.json({ error: "Titles required" }, { status: 400 });

  let slug = typeof b.slug === "string" ? b.slug.trim().toLowerCase() : "";
  if (!slug) slug = slugify(titleUk);
  if (!isValidBlogSlug(slug)) return NextResponse.json({ error: "Invalid slug" }, { status: 400 });

  const excerptUk = typeof b.excerptUk === "string" ? b.excerptUk.trim() || null : null;
  const excerptEn = typeof b.excerptEn === "string" ? b.excerptEn.trim() || null : null;
  const published = Boolean(b.published);
  const publishedAt = published ? existing.publishedAt ?? new Date() : null;

  let coverImageUrl: string | null | undefined = undefined;
  if (b.coverImageUrl === null || b.coverImageUrl === "") {
    coverImageUrl = null;
  } else if (typeof b.coverImageUrl === "string") {
    const c = b.coverImageUrl.trim();
    if (!c) coverImageUrl = null;
    else if (!isAllowedBlogCoverUrl(c)) {
      return NextResponse.json({ error: "Invalid cover image URL" }, { status: 400 });
    } else coverImageUrl = c;
  }

  try {
    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        slug,
        titleUk,
        titleEn,
        excerptUk,
        excerptEn,
        bodyUk,
        bodyEn,
        ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
        published,
        publishedAt,
      },
      select: { id: true, slug: true },
    });
    return NextResponse.json(post);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    throw e;
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isUserAdmin(session.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  try {
    await prisma.blogPost.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

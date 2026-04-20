import { isUserAdmin } from "@/lib/admin";
import { isAllowedBlogCoverUrl } from "@/lib/blog-cover-url";
import { isValidBlogSlug, slugify } from "@/lib/blog-slug";
import { parseExtraTranslationsBody, syncExtraBlogTranslations } from "@/lib/blog-post-translations";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isUserAdmin(session.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  let coverImageUrl: string | null = null;
  if (b.coverImageUrl === null || b.coverImageUrl === "") {
    coverImageUrl = null;
  } else if (typeof b.coverImageUrl === "string") {
    const c = b.coverImageUrl.trim();
    if (!c) coverImageUrl = null;
    else if (!isAllowedBlogCoverUrl(c)) {
      return NextResponse.json({ error: "Invalid cover image URL" }, { status: 400 });
    } else coverImageUrl = c;
  }

  const extraTranslations = parseExtraTranslationsBody(b.translations);

  try {
    const post = await prisma.blogPost.create({
      data: {
        slug,
        titleUk,
        titleEn,
        excerptUk,
        excerptEn,
        bodyUk,
        bodyEn,
        coverImageUrl,
        published,
        publishedAt: published ? new Date() : null,
        authorId: session.user.id,
      },
      select: { id: true, slug: true },
    });
    await syncExtraBlogTranslations(post.id, extraTranslations);
    return NextResponse.json(post);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    throw e;
  }
}

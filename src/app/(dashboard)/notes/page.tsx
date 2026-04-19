import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import NotesView from "@/components/notes/NotesView";

export default async function NotesPage() {
  const session = await auth();
  if (!session) return null;
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return null;

  const [notes, categories] = await Promise.all([
    prisma.note.findMany({
      where: { familyId },
      include: {
        author: { select: { id: true, name: true, image: true, color: true, emoji: true } },
        category: { select: { id: true, name: true, emoji: true, color: true, parentId: true } },
      },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.noteCategory.findMany({
      where: { familyId },
      orderBy: [{ parentId: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const initialNotes = notes.map((n) => ({
    ...n,
    updatedAt: n.updatedAt.toISOString(),
  }));

  return (
    <NotesView
      initialNotes={initialNotes}
      initialCategories={categories}
      currentUserId={session.user.id}
    />
  );
}

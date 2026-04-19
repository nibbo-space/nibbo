import type { Event as DbEvent } from "@prisma/client";
import { addDays, addMonths, endOfDay, format, parseISO, startOfDay, subMonths } from "date-fns";
import type { calendar_v3 } from "googleapis";
import { prisma } from "@/lib/prisma";
import { AUTO_BILLING_MARKER } from "@/lib/subscription-calendar";
import { getCalendarClientForUser } from "@/lib/google-calendar";

export function shouldSkipEventForGoogleSync(event: {
  weeklyRepeat: boolean;
  subscriptionId: string | null;
  description: string | null;
}) {
  if (event.weeklyRepeat) return true;
  if (event.subscriptionId) return true;
  if (event.description?.startsWith(AUTO_BILLING_MARKER)) return true;
  return false;
}

function nibboToGoogle(
  event: DbEvent,
  familyId: string
): calendar_v3.Schema$Event {
  const emoji = event.emoji && event.emoji !== "event" ? `${event.emoji} ` : "";
  const summary = `${emoji}${event.title}`.trim() || event.title;
  const descParts = [event.description?.trim(), "", "— Nibbo"].filter(Boolean);
  const base: calendar_v3.Schema$Event = {
    summary,
    description: descParts.join("\n"),
    location: event.location || undefined,
    extendedProperties: {
      private: {
        nibboEventId: event.id,
        nibboFamilyId: familyId,
      },
    },
  };

  if (event.allDay) {
    const sd = startOfDay(new Date(event.startDate));
    const ed = startOfDay(new Date(event.endDate));
    const endExclusive = addDays(ed, 1);
    return {
      ...base,
      start: { date: format(sd, "yyyy-MM-dd") },
      end: { date: format(endExclusive, "yyyy-MM-dd") },
    };
  }

  return {
    ...base,
    start: { dateTime: new Date(event.startDate).toISOString() },
    end: { dateTime: new Date(event.endDate).toISOString() },
  };
}

function googleToNibboPatch(g: calendar_v3.Schema$Event): {
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location: string | null;
} {
  let startDate: Date;
  let endDate: Date;
  let allDay = false;

  if (g.start?.dateTime && g.end?.dateTime) {
    startDate = new Date(g.start.dateTime);
    endDate = new Date(g.end.dateTime);
  } else if (g.start?.date && g.end?.date) {
    allDay = true;
    startDate = startOfDay(parseISO(g.start.date));
    const endExclusive = parseISO(g.end.date);
    const lastDay = addDays(endExclusive, -1);
    endDate = endOfDay(lastDay);
  } else {
    startDate = new Date();
    endDate = addDays(startDate, 1);
  }

  return {
    title: g.summary?.trim() || "(event)",
    description: g.description?.replace(/\n*— Nibbo\s*$/i, "").trim() || null,
    startDate,
    endDate,
    allDay,
    location: g.location || null,
  };
}

export async function pushNibboEventToGoogleIfNeeded(familyId: string, eventId: string) {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: {
      googleCalendarSyncEnabled: true,
      googleCalendarSyncUserId: true,
      googleCalendarId: true,
    },
  });
  if (!family?.googleCalendarSyncEnabled || !family.googleCalendarSyncUserId) return;

  const event = await prisma.event.findFirst({
    where: { id: eventId, familyId },
  });
  if (!event || shouldSkipEventForGoogleSync(event)) return;

  const calendar = await getCalendarClientForUser(family.googleCalendarSyncUserId);
  const calId = family.googleCalendarId || "primary";
  const body = nibboToGoogle(event, familyId);

  if (event.googleEventId) {
    await calendar.events.patch({
      calendarId: calId,
      eventId: event.googleEventId,
      requestBody: body,
    });
    return;
  }

  const created = await calendar.events.insert({
    calendarId: calId,
    requestBody: body,
  });
  const gid = created.data.id;
  if (gid) {
    await prisma.event.update({
      where: { id: event.id },
      data: { googleEventId: gid },
    });
  }
}

export async function deleteNibboEventFromGoogleIfNeeded(familyId: string, eventId: string, googleEventId: string | null) {
  if (!googleEventId) return;
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: {
      googleCalendarSyncEnabled: true,
      googleCalendarSyncUserId: true,
      googleCalendarId: true,
    },
  });
  if (!family?.googleCalendarSyncEnabled || !family.googleCalendarSyncUserId) return;

  try {
    const calendar = await getCalendarClientForUser(family.googleCalendarSyncUserId);
    await calendar.events.delete({
      calendarId: family.googleCalendarId || "primary",
      eventId: googleEventId,
    });
  } catch {
    return;
  }
}

export async function syncFamilyCalendarWithGoogle(familyId: string) {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: {
      googleCalendarSyncEnabled: true,
      googleCalendarSyncUserId: true,
      googleCalendarId: true,
    },
  });
  if (!family?.googleCalendarSyncEnabled || !family.googleCalendarSyncUserId) {
    throw new Error("SYNC_DISABLED");
  }

  const calendar = await getCalendarClientForUser(family.googleCalendarSyncUserId);
  const calId = family.googleCalendarId || "primary";
  const timeMin = subMonths(new Date(), 3).toISOString();
  const timeMax = addMonths(new Date(), 18).toISOString();

  const items: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  do {
    const res = await calendar.events.list({
      calendarId: calId,
      timeMin,
      timeMax,
      singleEvents: true,
      maxResults: 2500,
      pageToken,
    });
    items.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  for (const g of items) {
    if (!g.id || g.status === "cancelled") continue;
    if (g.recurrence?.length) continue;

    const priv = g.extendedProperties?.private as { nibboEventId?: string; nibboFamilyId?: string } | undefined;
    if (priv?.nibboFamilyId && priv.nibboFamilyId !== familyId) continue;

    const fromNibbo = priv?.nibboFamilyId === familyId && priv?.nibboEventId;

    const googleUpdated = g.updated ? new Date(g.updated).getTime() : 0;

    if (fromNibbo && priv.nibboEventId) {
      const existing = await prisma.event.findFirst({
        where: { id: priv.nibboEventId, familyId },
      });
      if (!existing) continue;
      if (shouldSkipEventForGoogleSync(existing)) continue;
      const localUpdated = existing.updatedAt.getTime();
      if (localUpdated >= googleUpdated) continue;

      const data = googleToNibboPatch(g);
      await prisma.event.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
          allDay: data.allDay,
          location: data.location,
          googleEventId: g.id,
        },
      });
      continue;
    }

    const linked = await prisma.event.findFirst({
      where: { googleEventId: g.id, familyId },
    });
    if (linked) {
      if (shouldSkipEventForGoogleSync(linked)) continue;
      const localUpdated = linked.updatedAt.getTime();
      if (localUpdated >= googleUpdated) continue;
      const data = googleToNibboPatch(g);
      await prisma.event.update({
        where: { id: linked.id },
        data: {
          title: data.title,
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
          allDay: data.allDay,
          location: data.location,
        },
      });
      continue;
    }

    if (fromNibbo) continue;

    const patch = googleToNibboPatch(g);
    await prisma.event.create({
      data: {
        title: patch.title,
        description: patch.description,
        emoji: "📅",
        color: "#8b5cf6",
        startDate: patch.startDate,
        endDate: patch.endDate,
        allDay: patch.allDay,
        weeklyRepeat: false,
        weeklyDay: null,
        location: patch.location,
        assigneeId: null,
        subscriptionId: null,
        googleEventId: g.id,
        familyId,
      },
    });
  }

  const locals = await prisma.event.findMany({
    where: { familyId },
  });
  for (const ev of locals) {
    if (shouldSkipEventForGoogleSync(ev)) continue;
    const body = nibboToGoogle(ev, familyId);
    try {
      if (ev.googleEventId) {
        await calendar.events.patch({
          calendarId: calId,
          eventId: ev.googleEventId,
          requestBody: body,
        });
      } else {
        const created = await calendar.events.insert({
          calendarId: calId,
          requestBody: body,
        });
        const gid = created.data.id;
        if (gid) {
          await prisma.event.update({
            where: { id: ev.id },
            data: { googleEventId: gid },
          });
        }
      }
    } catch {
      continue;
    }
  }

  await prisma.family.update({
    where: { id: familyId },
    data: { googleCalendarLastSyncAt: new Date() },
  });
}

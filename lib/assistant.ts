import "server-only";
import { sql } from "@/lib/db";
import {
  dayKey,
  fmtDate,
  fmtDateTime,
  fmtFee,
  fmtTime,
  registrationGate,
  relativeDeadline,
  teamLabel,
} from "@/lib/types";

/**
 * Event assistant.
 *
 * Deliberately NOT a language model. There is no API key in this project and
 * no budget for one, and a feature that stops working when a free quota runs
 * out is worse than no feature. So this is deterministic: it classifies the
 * question against a fixed set of intents, resolves any event named in it, and
 * answers from live database rows.
 *
 * The trade is honest — it cannot hold a conversation, but it never invents an
 * event that doesn't exist, never quotes a stale price, and never goes down.
 * Everything it says is read from the same tables the pages render from.
 */

export interface AssistantItem {
  title: string;
  href: string;
  meta: string;
}

export interface AssistantReply {
  text: string;
  items?: AssistantItem[];
  suggestions?: string[];
}

const STOP = new Set([
  "the","a","an","is","are","was","were","do","does","did","i","you","we","my","me","to","for",
  "of","in","on","at","and","or","it","this","that","what","when","where","how","can","could",
  "please","tell","show","give","about","there","any","some","be","will","would","get","got",
  "much","many","long","event","events","axon","club","robotics","?","!",".",
]);

function tokens(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

interface EventLite {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string | null;
  starts_at: Date;
  venue: string | null;
  capacity: number | null;
  seats_taken: number;
  registration_deadline: Date | null;
  fee_bdt: number;
  team_min: number;
  team_max: number;
  status: "draft" | "published" | "cancelled";
  prize: string | null;
  fest_name: string;
  fest_slug: string;
  waitlisted: number;
}

async function allEvents(): Promise<EventLite[]> {
  return sql<EventLite[]>`
    select e.id, e.title, e.slug, e.category, e.summary, e.starts_at, e.venue, e.capacity,
           e.registration_deadline, e.fee_bdt, e.team_min, e.team_max, e.status, e.prize,
           f.name as fest_name, f.slug as fest_slug,
           (select count(*) from registrations r where r.event_id = e.id
              and r.status in ('pending','confirmed','checked_in'))::int as seats_taken,
           (select count(*) from registrations r2 where r2.event_id = e.id
              and r2.status = 'waitlisted')::int as waitlisted
    from events e
    join fests f on f.id = e.fest_id
    where e.status != 'draft' and f.status = 'published'
    order by e.starts_at asc
  `;
}

/** Scores how well a question names a particular event. */
function matchEvent(words: string[], events: EventLite[]): EventLite | null {
  let best: { e: EventLite; score: number } | null = null;

  for (const e of events) {
    const hay = `${e.title} ${e.category} ${e.summary ?? ""}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (e.title.toLowerCase().includes(w)) score += 3;
      else if (hay.includes(w)) score += 1;
    }
    // Reward matching a larger share of the title, so "quiz" prefers
    // "Robo-Quiz" over an event that merely mentions quizzes.
    if (score > 0) score += 2 / e.title.length;
    if (score > 0 && (!best || score > best.score)) best = { e, score };
  }
  return best && best.score >= 3 ? best.e : null;
}

function toItem(e: EventLite): AssistantItem {
  const gate = registrationGate(e, e.seats_taken);
  const left =
    e.capacity === null ? "no limit" : gate.seatsLeft === 0 ? "full" : `${gate.seatsLeft} left`;
  return {
    title: e.title,
    href: `/events/${e.slug}`,
    meta: `${fmtDate(e.starts_at)} · ${fmtFee(e.fee_bdt)} · ${left}`,
  };
}

const SUGGESTIONS = [
  "What events are open?",
  "Which events are free?",
  "When is the line follower?",
  "How do I register?",
];

const CATEGORY_WORDS: Record<string, string> = {
  hardware: "Hardware",
  robot: "Hardware",
  drone: "Drone",
  fpv: "Drone",
  ai: "AI / ML",
  ml: "AI / ML",
  vision: "AI / ML",
  software: "Software",
  code: "Software",
  coding: "Software",
  hackathon: "Software",
  workshop: "Workshop",
  design: "Design",
  cad: "Design",
  esports: "Esports",
  gaming: "Esports",
  quiz: "Quiz",
};

export async function ask(question: string): Promise<AssistantReply> {
  const q = question.trim();
  if (!q) return { text: "Ask me anything about the club's events.", suggestions: SUGGESTIONS };

  const lower = q.toLowerCase();
  const words = tokens(q);
  const events = await allEvents();
  const now = new Date();
  const named = matchEvent(words, events);

  const has = (...keys: string[]) => keys.some((k) => lower.includes(k));

  /* -- greetings ---------------------------------------------------------- */
  if (/^(hi|hey|hello|salam|assalamu|yo)\b/.test(lower) || lower === "help") {
    return {
      text:
        "Hello. I can look up event dates, fees, deadlines, seats remaining and how registration works. I read the live event data, so whatever I tell you is current.",
      suggestions: SUGGESTIONS,
    };
  }

  /* -- how to register ---------------------------------------------------- */
  if (has("how do i register", "how to register", "how can i register", "sign up for")) {
    return {
      text:
        "Open an event, press Register, and fill in the form the organisers built for it. You'll need an account first — it takes about twenty seconds and there's no confirmation email to wait for. When you submit you get a ticket code and a QR pass, and you can cancel any time from My registrations.",
      items: events
        .filter((e) => registrationGate(e, e.seats_taken).open)
        .slice(0, 3)
        .map(toItem),
      suggestions: ["What events are open?", "Which events are free?"],
    };
  }

  /* -- a specific event --------------------------------------------------- */
  if (named) {
    const gate = registrationGate(named, named.seats_taken, now);
    const deadline = relativeDeadline(named.registration_deadline, now);

    if (has("deadline", "last date", "close", "closing", "until when")) {
      return {
        text: named.registration_deadline
          ? `Registration for ${named.title} closes ${fmtDateTime(named.registration_deadline)} — ${deadline?.toLowerCase()}.`
          : `${named.title} has no registration deadline set.`,
        items: [toItem(named)],
      };
    }
    if (has("fee", "cost", "price", "pay", "charge", "taka", "bdt")) {
      return {
        text:
          named.fee_bdt === 0
            ? `${named.title} is free to enter.`
            : `${named.title} costs ${fmtFee(named.fee_bdt)} per entry. You'll be asked for your payment method and transaction reference on the registration form — bKash, Nagad, Rocket, bank transfer, card or cash on arrival.`,
        items: [toItem(named)],
      };
    }
    if (has("seat", "full", "space", "spot", "capacity", "left", "available", "waitlist")) {
      if (named.capacity === null) {
        return { text: `${named.title} has no seat limit, so there's always room.`, items: [toItem(named)] };
      }
      const left = Math.max(0, named.capacity - named.seats_taken);
      return {
        text:
          left > 0
            ? `${named.title} has ${left} of ${named.capacity} seats left (${named.seats_taken} taken).`
            : `${named.title} is full at ${named.capacity}/${named.capacity}${named.waitlisted > 0 ? `, with ${named.waitlisted} on the waitlist` : ""}. You can still join the waitlist — if anyone cancels, the first person in the queue is promoted automatically.`,
        items: [toItem(named)],
      };
    }
    if (has("where", "venue", "location", "place")) {
      return {
        text: `${named.title} is at ${named.venue ?? "a venue still to be announced"}, part of ${named.fest_name}.`,
        items: [toItem(named)],
      };
    }
    if (has("prize", "win", "reward")) {
      return {
        text: named.prize
          ? `${named.title} has a prize of ${named.prize}.`
          : `${named.title} doesn't have a prize listed — it's a workshop or showcase rather than a competition.`,
        items: [toItem(named)],
      };
    }
    if (has("team", "alone", "solo", "group", "how many people")) {
      return {
        text: `${named.title}: ${teamLabel(named.team_min, named.team_max).toLowerCase()}.`,
        items: [toItem(named)],
      };
    }

    // Default: a full briefing on the named event.
    const status = gate.open
      ? `Registration is open${deadline ? ` and ${deadline.toLowerCase()}` : ""}.`
      : gate.reason === "capacity"
        ? "It's full, but you can join the waitlist."
        : gate.reason === "deadline"
          ? "Registration has closed."
          : gate.reason === "started"
            ? "It has already taken place."
            : "It was cancelled.";

    return {
      text: `${named.title} runs on ${fmtDate(named.starts_at)} at ${fmtTime(named.starts_at)}, ${named.venue ? `at ${named.venue}` : "venue to be announced"}. It's part of ${named.fest_name}, costs ${fmtFee(named.fee_bdt)}, and is ${teamLabel(named.team_min, named.team_max).toLowerCase()}. ${status}`,
      items: [toItem(named)],
    };
  }

  /* -- free / paid -------------------------------------------------------- */
  if (has("free")) {
    const free = events.filter((e) => e.fee_bdt === 0 && registrationGate(e, e.seats_taken, now).open);
    return {
      text: free.length
        ? `${free.length} free ${free.length === 1 ? "event is" : "events are"} open right now.`
        : "Nothing free is open at the moment, though several free workshops run at the Freshers' Circuit.",
      items: free.slice(0, 6).map(toItem),
    };
  }

  /* -- open for registration --------------------------------------------- */
  if (has("open", "available", "register now", "can i join", "still")) {
    const open = events.filter((e) => registrationGate(e, e.seats_taken, now).open);
    return {
      text: `${open.length} ${open.length === 1 ? "event is" : "events are"} open for registration right now.`,
      items: open.slice(0, 6).map(toItem),
      suggestions: ["Which events are free?", "How do I register?"],
    };
  }

  /* -- category ----------------------------------------------------------- */
  for (const w of words) {
    const cat = CATEGORY_WORDS[w];
    if (!cat) continue;
    const inCat = events.filter((e) => e.category === cat);
    if (inCat.length) {
      return {
        text: `${inCat.length} ${cat} ${inCat.length === 1 ? "event" : "events"} across all festivals.`,
        items: inCat.slice(0, 6).map(toItem),
      };
    }
  }

  /* -- fests -------------------------------------------------------------- */
  if (has("fest", "festival", "carnival", "sprint", "circuit")) {
    const fests = await sql<{ name: string; slug: string; start_date: string | Date; end_date: string | Date; n: number }[]>`
      select f.name, f.slug, f.start_date, f.end_date,
             (select count(*) from events e where e.fest_id = f.id and e.status != 'draft')::int as n
      from fests f where f.status = 'published' order by f.start_date desc
    `;
    return {
      text: `The club runs ${fests.length} festivals. Each one contains its own set of events.`,
      items: fests.map((f) => ({
        title: f.name,
        href: `/fests/${f.slug}`,
        meta: `${fmtDate(dayKey(f.start_date) + "T00:00:00Z")} · ${f.n} events`,
      })),
    };
  }

  /* -- soonest ------------------------------------------------------------ */
  if (has("next", "soon", "upcoming", "this week", "weekend", "tomorrow")) {
    const soon = events.filter((e) => new Date(e.starts_at) > now).slice(0, 5);
    return {
      text: soon.length ? "The next events on the calendar:" : "Nothing is scheduled ahead right now.",
      items: soon.map(toItem),
    };
  }

  /* -- my registrations --------------------------------------------------- */
  if (has("my registration", "my ticket", "my event", "cancel", "booked")) {
    return {
      text:
        "Everything you've signed up for lives under My registrations, grouped into upcoming, attended and cancelled. You can re-open any ticket there, or cancel anything that hasn't happened yet — cancelling frees your seat and promotes the first person off the waitlist.",
      items: [{ title: "My registrations", href: "/me/registrations", meta: "Your tickets and statuses" }],
    };
  }

  /* -- fallback: keyword search over the real events ---------------------- */
  const hits = events
    .map((e) => {
      const hay = `${e.title} ${e.category} ${e.summary ?? ""} ${e.venue ?? ""} ${e.fest_name}`.toLowerCase();
      return { e, n: words.filter((w) => hay.includes(w)).length };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  if (hits.length) {
    return {
      text: `Here's what matches "${q}":`,
      items: hits.map((h) => toItem(h.e)),
    };
  }

  return {
    text:
      "I couldn't find anything for that. I can answer questions about event dates, fees, deadlines, seats remaining, team sizes, prizes and how registration works — try naming an event, or browse the full directory.",
    items: [{ title: "Browse all events", href: "/events", meta: `${events.length} events across all fests` }],
    suggestions: SUGGESTIONS,
  };
}

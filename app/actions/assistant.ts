"use server";

import { ask, type AssistantReply } from "@/lib/assistant";

/** Thin server-action wrapper so the widget can stay a small client component. */
export async function askAssistantAction(question: string): Promise<AssistantReply> {
  // Cheap guard: the lookup is bounded work, but there's no reason to let a
  // caller push a megabyte of text through it.
  return ask(question.slice(0, 300));
}

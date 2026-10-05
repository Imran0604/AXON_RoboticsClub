"use client";

import { useEffect, useState } from "react";

/**
 * Bulk selection toolbar.
 *
 * The checkboxes live inside the table but are associated with the bulk form
 * by their `form` attribute, so the table can still contain its own per-row
 * action forms — nesting forms is invalid HTML, and this avoids it.
 */
export function BulkToolbar({ formId }: { formId: string }) {
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    function boxes() {
      return Array.from(
        document.querySelectorAll<HTMLInputElement>(`input[name="selected"][form="${formId}"]`)
      );
    }
    function update() {
      const all = boxes();
      setTotal(all.length);
      setCount(all.filter((b) => b.checked).length);
    }
    update();
    document.addEventListener("change", update);
    return () => document.removeEventListener("change", update);
  }, [formId]);

  function setAll(checked: boolean) {
    document
      .querySelectorAll<HTMLInputElement>(`input[name="selected"][form="${formId}"]`)
      .forEach((b) => {
        b.checked = checked;
      });
    setCount(checked ? total : 0);
  }

  const none = count === 0;

  return (
    <div
      className="flex flex-wrap items-center gap-2.5 rounded-sm border px-3 py-2.5"
      style={{
        background: none ? "var(--surface-2)" : "var(--navy-soft)",
        borderColor: none ? "var(--line)" : "var(--navy)",
      }}
    >
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          className="check"
          checked={total > 0 && count === total}
          onChange={(e) => setAll(e.target.checked)}
          aria-label="Select all rows on this page"
        />
        <span className="text-[0.8125rem] font-semibold">
          {none ? "Select rows to act on them" : `${count} selected`}
        </span>
      </label>

      {!none && (
        <button type="button" onClick={() => setAll(false)} className="btn btn-quiet btn-sm">
          Clear
        </button>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <select
          name="status"
          form={formId}
          className="field max-w-[11rem] py-1.5 text-[0.8125rem]"
          aria-label="Status to apply"
          disabled={none}
          defaultValue="confirmed"
        >
          <option value="confirmed">Approve (confirm)</option>
          <option value="pending">Mark pending</option>
          <option value="waitlisted">Move to waitlist</option>
          <option value="rejected">Reject</option>
          <option value="checked_in">Check in</option>
          <option value="cancelled">Cancel</option>
        </select>
        <button type="submit" form={formId} className="btn btn-primary btn-sm" disabled={none}>
          Apply to {count || "…"}
        </button>
      </div>
    </div>
  );
}

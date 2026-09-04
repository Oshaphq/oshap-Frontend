import type { ReactNode } from "react";

/**
 * A screen's outer column.
 *
 * Reported as "the inventory, z-report and settings pages have empty space on
 * the right". The cap was not the problem — the cap was **left-pinned**. Five
 * routes set `max-w-*` on `<main>` with no `mx-auto`, so every pixel of slack
 * collected on one side, which reads as a rendering fault rather than as a
 * measure. Centre the same cap and it reads as a decision.
 *
 * The second half of the report was that content should use a desktop screen,
 * and that is a different question per screen, so the widths are named for the
 * job rather than for a number:
 *
 * - `narrow` — a single-column form somebody fills top to bottom, where a
 *   wider measure would put the labels a long way from their fields.
 * - `reading` — a column of prose and figures meant to be read down. A daily
 *   close is checked line by line, and stretching it to 1500px makes the eye
 *   travel further for no gain.
 * - `form` — fields and their labels. Wider than a reading column, narrower
 *   than a table.
 * - `wide` — data the reader scans in columns. A table is not read in lines,
 *   so a reading measure is the wrong constraint, and it is what left roughly
 *   500px empty beside the ingredients list.
 * - `full` — screens that lay out their own grid and want the whole viewport.
 *
 * Six routes had no cap at all, so the app changed shape from tab to tab.
 * They are `full` now, which is what they were doing, but said out loud.
 */

const WIDTH = {
  narrow: "max-w-[36rem] mx-auto",
  reading: "max-w-[42rem] mx-auto",
  form: "max-w-[52rem] mx-auto",
  wide: "max-w-[88rem] mx-auto",
  full: "",
} as const;

/** Written out, not interpolated: Tailwind scans for literal class names. */
const GAP = { md: "gap-md", l: "gap-l" } as const;

export interface PageProps {
  width?: keyof typeof WIDTH;
  /** Vertical rhythm between the screen's blocks. */
  gap?: keyof typeof GAP;
  children: ReactNode;
  className?: string;
}

export default function Page({
  width = "full",
  gap = "l",
  children,
  className = "",
}: PageProps) {
  return (
    <main
      className={`p-md flex flex-col ${GAP[gap]} w-full ${WIDTH[width]} ${className}`}
    >
      {children}
    </main>
  );
}

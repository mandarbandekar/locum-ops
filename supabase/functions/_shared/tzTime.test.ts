// Edge-function-level verification of timezone boundary math.
// Mirrors the three claims requested in the V1 verification pass:
//   1) May 31 11 PM Pacific shift IS in the May invoice period.
//   2) Same shift is NOT in the June invoice period.
//   3) A reminder at 11 PM Pacific classifies "today" using Pacific local
//      date, not UTC.
//
// Run with: supabase--test_edge_functions

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  periodBoundsUtc,
  localYMDInTz,
  zonedWallClockToUtc,
} from "./tzTime.ts";

const LA = "America/Los_Angeles";

Deno.test("May 31 11 PM Pacific shift falls inside May monthly period", () => {
  const shiftUtc = zonedWallClockToUtc("2026-05-31", "23:00", LA);
  // Sanity: this instant is June 1 in UTC.
  assertEquals(shiftUtc.toISOString().slice(0, 10), "2026-06-01");

  const may = periodBoundsUtc("monthly", shiftUtc, LA);
  assertEquals(may.startYMD, "2026-05-01");
  assertEquals(may.endYMD, "2026-05-31");
  assert(shiftUtc.getTime() >= may.startUtc.getTime());
  assert(shiftUtc.getTime() < may.endUtcExclusive.getTime());
});

Deno.test("Same shift is NOT inside June monthly period", () => {
  const shiftUtc = zonedWallClockToUtc("2026-05-31", "23:00", LA);
  const juneRef = zonedWallClockToUtc("2026-06-15", "12:00", LA);
  const june = periodBoundsUtc("monthly", juneRef, LA);
  assertEquals(june.startYMD, "2026-06-01");
  assert(shiftUtc.getTime() < june.startUtc.getTime());
});

Deno.test("Reminder 'today' at 11 PM Pacific uses Pacific date, not UTC", () => {
  const nowUtc = zonedWallClockToUtc("2026-05-31", "23:00", LA);
  // Local-Pacific calendar date is May 31; UTC has rolled to June 1.
  assertEquals(localYMDInTz(nowUtc, LA), "2026-05-31");
  assertEquals(nowUtc.toISOString().slice(0, 10), "2026-06-01");

  // A shift that ended earlier the same Pacific day is NOT "before today".
  const sameDayEnd = zonedWallClockToUtc("2026-05-31", "16:00", LA);
  assertEquals(localYMDInTz(sameDayEnd, LA), "2026-05-31");
  assert(localYMDInTz(sameDayEnd, LA) === localYMDInTz(nowUtc, LA));

  // Previous Pacific day IS before today.
  const yest = zonedWallClockToUtc("2026-05-30", "20:00", LA);
  assert(localYMDInTz(yest, LA) < localYMDInTz(nowUtc, LA));
});

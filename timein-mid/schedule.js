// Shared schedule helpers for Tempo. Identical in every shift folder.
//
// Times are "HH:MM" (24-hour) in Philippine time. The flow uses
// Singapore Standard Time, which is the same UTC+8 offset with no
// daylight saving, so a fixed offset is safe here.
(() => {
  const SHIFT = globalThis.TEMPO_SHIFT;
  const MEAL = SHIFT.meal;

  const TIME_ZONE = "Asia/Singapore";
  const UTC_OFFSET_MINUTES = 8 * 60;

  const DURATIONS = Object.freeze({
    snack: 30,
    meal: 60
  });

  const LABELS = Object.freeze({
    snack: "Snack Break",
    meal: MEAL.label,
    learning: "Learning Time"
  });

  function parseTime(value) {
    if (typeof value !== "string") {
      return null;
    }

    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

    return match
      ? Number(match[1]) * 60 + Number(match[2])
      : null;
  }

  function splitClock(minutes) {
    const dayMinutes = ((minutes % 1440) + 1440) % 1440;
    const hours = Math.floor(dayMinutes / 60);
    const mins = String(dayMinutes % 60).padStart(2, "0");

    return {
      clock: `${hours % 12 || 12}:${mins}`,
      period: hours < 12 ? "AM" : "PM"
    };
  }

  // 600 -> "10:00 AM"
  function formatClock(minutes) {
    const { clock, period } = splitClock(minutes);

    return `${clock} ${period}`;
  }

  // 600, 630 -> "10:00–10:30 AM"; 705, 765 -> "11:45 AM–12:45 PM"
  function formatRange(start, end) {
    const a = splitClock(start);
    const b = splitClock(end);

    return a.period === b.period
      ? `${a.clock}–${b.clock} ${b.period}`
      : `${a.clock} ${a.period}–${b.clock} ${b.period}`;
  }

  // Saved times merged over this shift's defaults. Invalid entries are
  // replaced by the default for that entry.
  function resolveTimes(saved) {
    const times = { ...SHIFT.defaultTimes };

    if (saved && typeof saved === "object") {
      for (const key of Object.keys(times)) {
        if (parseTime(saved[key]) !== null) {
          times[key] = saved[key].trim();
        }
      }
    }

    return times;
  }

  // Returns an error message, or "" when the times are usable.
  function validateTimes(times) {
    for (const key of Object.keys(LABELS)) {
      if (parseTime(times?.[key]) === null) {
        return `Enter a valid start time for ${LABELS[key]}.`;
      }
    }

    if (parseTime(times.learning) >= parseTime(times.meal)) {
      return `Learning Time must start before ${MEAL.label}. Scheduled Learning Time pauses for ${MEAL.label.toLowerCase()}, then continues.`;
    }

    return "";
  }

  // Today's date in Philippine time.
  function todayParts(now) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(now);

    const read = type =>
      Number(parts.find(part => part.type === type).value);

    return {
      year: read("year"),
      month: read("month"),
      day: read("day")
    };
  }

  // A Date for today's Philippine date at the given minutes after midnight.
  // Minutes past 1440 roll over into the next day.
  function todayAt(minutes, now = new Date()) {
    const { year, month, day } = todayParts(now);

    return new Date(
      Date.UTC(year, month - 1, day, 0, minutes - UTC_OFFSET_MINUTES)
    );
  }

  // UTC ISO timestamp without milliseconds, e.g. "2026-11-27T02:00:00Z".
  // Power Automate's "Delay until" and ticks() accept this format.
  function toFlowTimestamp(date) {
    return date.toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  // Describes a scheduled action for the given times, or returns null for
  // actions that are not scheduled. `points` are the timestamps sent to
  // the flow, in minutes after midnight.
  function scheduledPlan(action, times) {
    const snack = parseTime(times.snack);
    const meal = parseTime(times.meal);
    const learning = parseTime(times.learning);
    const mealLower = MEAL.label.toLowerCase();

    if (action === "SNACK_SCHED") {
      const back = snack + DURATIONS.snack;

      return {
        label: LABELS.snack,
        icon: "☕",
        start: snack,
        points: { startAt: snack, backAt: back },
        summary: formatRange(snack, back),
        confirm: `Snack break at ${formatClock(snack)}. Back at ${formatClock(back)}.`
      };
    }

    if (action === MEAL.scheduledAction) {
      const back = meal + DURATIONS.meal;

      return {
        label: MEAL.label,
        icon: MEAL.icon,
        start: meal,
        points: { startAt: meal, backAt: back },
        summary: formatRange(meal, back),
        confirm: `${MEAL.label} at ${formatClock(meal)}. Back at ${formatClock(back)}.`
      };
    }

    if (action === "LEARNING_SCHED") {
      const back = meal + DURATIONS.meal;

      return {
        label: LABELS.learning,
        icon: "📚",
        start: learning,
        points: { startAt: learning, mealAt: meal, backAt: back },
        summary: `${formatClock(learning)}, ${mealLower} ${formatRange(meal, back)}`,
        confirm: `${formatClock(learning)}: training, then (learning time). ${formatClock(meal)}: ${mealLower}. ${formatClock(back)}: back, then training and (learning time) again.`
      };
    }

    return null;
  }

  globalThis.TempoSchedule = Object.freeze({
    DURATIONS,
    LABELS,
    parseTime,
    formatClock,
    formatRange,
    resolveTimes,
    validateTimes,
    todayAt,
    toFlowTimestamp,
    scheduledPlan
  });
})();

// Shift settings for Tempo.
// This is the only script that differs between the timein-morning and
// timein-mid folders. Every other .js and .html file is identical.
globalThis.TEMPO_SHIFT = Object.freeze({
  id: "morning",
  name: "Morning Shift",

  // The meal break for this shift and the action names sent to the flow.
  meal: Object.freeze({
    label: "Lunch",
    icon: "🍱",
    nowAction: "LUNCH",
    scheduledAction: "LUNCH_SCHED",
    rtoAction: "LUNCHH"
  }),

  // Default start times for Scheduled mode (24-hour, Philippine time).
  // Each user can change these in Settings.
  defaultTimes: Object.freeze({
    snack: "10:00",
    meal: "13:00",
    learning: "10:00"
  })
});

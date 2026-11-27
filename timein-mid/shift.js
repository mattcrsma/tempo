// Shift settings for Tempo.
// This is the only script that differs between the timein-morning and
// timein-mid folders. Every other .js and .html file is identical.
globalThis.TEMPO_SHIFT = Object.freeze({
  id: "mid",
  name: "Mid Shift",

  // The meal break for this shift and the action names sent to the flow.
  meal: Object.freeze({
    label: "Dinner",
    icon: "🍽️",
    nowAction: "DINNER",
    scheduledAction: "DINNER_SCHED",
    rtoAction: "DINNERR"
  }),

  // Default start times for Scheduled mode (24-hour, Philippine time).
  // Each user can change these in Settings.
  defaultTimes: Object.freeze({
    snack: "18:00",
    meal: "20:00",
    learning: "18:00"
  })
});

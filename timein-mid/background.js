importScripts("shift.js", "schedule.js");

const SHIFT = globalThis.TEMPO_SHIFT;
const {
  resolveTimes,
  validateTimes,
  scheduledPlan,
  todayAt,
  toFlowTimestamp,
  formatClock
} = globalThis.TempoSchedule;

const allowedActions = new Set([
  "TIME_IN",
  "SNACK",
  SHIFT.meal.nowAction,
  "SNACK_SCHED",
  SHIFT.meal.scheduledAction,
  "LEARNING",
  "LEARNING_SCHED",
  "SNACKK",
  SHIFT.meal.rtoAction,
  "BACKK"
]);

const MAX_BYEBYE_MESSAGES = 20;
const MAX_BYEBYE_LENGTH = 200;

let sending = false;

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Picks one saved byebye message at random. Returns "" when none are saved,
// so the flow falls back to its default text.
function pickByebyeMessage(saved) {
  if (!Array.isArray(saved)) {
    return "";
  }

  const options = saved
    .filter(text => typeof text === "string")
    .map(text => text.trim().slice(0, MAX_BYEBYE_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_BYEBYE_MESSAGES);

  if (!options.length) {
    return "";
  }

  const choice = options[Math.floor(Math.random() * options.length)];

  // The flow posts this inside an HTML paragraph.
  return escapeHtml(choice);
}

function withTimeout(promise, milliseconds = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Operation timed out."));
    }, milliseconds);

    Promise.resolve(promise).then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function validateFlowUrl(value) {
  if (typeof value !== "string") {
    throw new Error("Invalid saved URL.");
  }

  const raw = value.trim();

  if (!raw) {
    return "";
  }

  const url = new URL(raw);

  const allowedHost = [
    ".environment.api.powerplatform.com",
    ".logic.azure.com"
  ].some(suffix => url.hostname.endsWith(suffix));

  const validPath =
    /\/workflows\/[^/]+\/triggers\/[^/]+\/paths\/invoke\/?$/.test(
      url.pathname
    );

  if (
    url.protocol !== "https:" ||
    !allowedHost ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    !validPath ||
    !url.searchParams.get("sig")
  ) {
    throw new Error("Invalid saved URL.");
  }

  return raw;
}

async function sendAction(action) {
  if (!allowedActions.has(action)) {
    return {
      type: "error",
      message: "Unknown action."
    };
  }

  if (sending) {
    return {
      type: "error",
      message: "Another request is still being sent. Please wait."
    };
  }

  sending = true;

  let result;

  try {
    const data = await withTimeout(
      chrome.storage.local.get([
        "flowUrl",
        "byebyeMessages",
        "scheduleTimes"
      ])
    );

    let url;

    try {
      url = validateFlowUrl(data.flowUrl || "");
    } catch {
      result = {
        type: "error",
        message: "Your saved HTTP URL is invalid. Open Settings and save the complete trigger URL again."
      };
    }

    if (!result && !url) {
      result = {
        type: "error",
        message: "Open ⚙ Settings and save your HTTP URL first."
      };
    }

    const payload = { action };
    let plan = null;

    if (!result) {
      const times = resolveTimes(data.scheduleTimes);
      plan = scheduledPlan(action, times);

      if (plan) {
        const now = new Date();
        const timesError = validateTimes(times);

        if (timesError) {
          result = {
            type: "error",
            message: `${timesError} Open ⚙ Settings to fix your break schedule.`
          };
        } else if (now >= todayAt(plan.start, now)) {
          result = {
            type: "error",
            message: `Too late to schedule ${plan.label}. It must be sent before ${formatClock(plan.start)} (Philippine time). Switch to "Now" to start it immediately, or change the time in ⚙ Settings.`
          };
        } else {
          // The flow waits until these UTC timestamps.
          for (const [key, minutes] of Object.entries(plan.points)) {
            payload[key] = toFlowTimestamp(todayAt(minutes, now));
          }
        }
      }
    }

    if (!result) {
      if (action === "TIME_IN") {
        const byebyeMessage = pickByebyeMessage(data.byebyeMessages);

        if (byebyeMessage) {
          payload.byebyeMessage = byebyeMessage;
        }
      }

      const controller = new AbortController();

      const timer = setTimeout(() => {
        controller.abort();
      }, 25000);

      let response;

      try {
        response = await fetch(url, {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(payload),
          signal: controller.signal,
          credentials: "omit",
          redirect: "error",
          referrerPolicy: "no-referrer"
        });
      } finally {
        clearTimeout(timer);
      }

      if (response.ok) {
        result = {
          type: "success",
          message: plan
            ? `✓ ${plan.label} scheduled for ${plan.summary} (Philippine time). Check Power Automate run history for completion.`
            : "✓ Request accepted. Check Power Automate run history for completion."
        };
      } else {
        const advice = [401, 403].includes(response.status)
          ? "Check the trigger authentication and saved URL."
          : "Check Power Automate run history before retrying.";

        result = {
          type: "error",
          message: `HTTP ${response.status}. ${advice}`
        };
      }
    }
  } catch {
    result = {
      type: "error",
      message: "Could not confirm delivery. Check your saved URL, connection, and Power Automate run history before retrying."
    };
  }

  try {
    await withTimeout(
      chrome.storage.local.set({
        lastResult: result
      }),
      2000
    );
  } catch {
    // Saving the display status does not change the request outcome.
  } finally {
    sending = false;
  }

  return result;
}

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) {
      return;
    }

    if (message?.type !== "sendAction") {
      return;
    }

    sendAction(message.action).then(
      sendResponse,
      () => {
        sending = false;

        sendResponse({
          type: "error",
          message: "Could not confirm delivery. Check flow run history before retrying."
        });
      }
    );

    return true;
  }
);

// Restrict stored settings to trusted extension contexts.
chrome.storage.local.setAccessLevel({
  accessLevel: "TRUSTED_CONTEXTS"
}).catch(() => {});
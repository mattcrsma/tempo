const allowedActions = new Set([
  "TIME_IN",
  "SNACK",
  "LUNCH",
  "SNACK_SCHED",
  "LUNCH_SCHED",
  "SNACKK",
  "LUNCHH",
  "BACKK"
]);

// Scheduled breaks use the same time zone as the flow (Singapore Standard Time).
const SCHEDULE_TIME_ZONE = "Asia/Singapore";

const scheduledActions = {
  SNACK_SCHED: {
    label: "Snack Break",
    startMinutes: 10 * 60,
    startText: "10:00 AM",
    windowText: "10:00–10:30 AM"
  },

  LUNCH_SCHED: {
    label: "Lunch",
    startMinutes: 13 * 60,
    startText: "1:00 PM",
    windowText: "1:00–2:00 PM"
  }
};

const MAX_BYEBYE_MESSAGES = 20;
const MAX_BYEBYE_LENGTH = 200;

let sending = false;

function currentMinutesInScheduleZone() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHEDULE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const read = type =>
    Number(parts.find(part => part.type === type).value);

  return read("hour") * 60 + read("minute");
}

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

  const schedule = scheduledActions[action];

  if (
    schedule &&
    currentMinutesInScheduleZone() >= schedule.startMinutes
  ) {
    return {
      type: "error",
      message: `Too late to schedule ${schedule.label}. It must be sent before ${schedule.startText} (Singapore time). Switch to "Now" to start it immediately.`
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
      chrome.storage.local.get(["flowUrl", "byebyeMessages"])
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

    if (!result) {
      const payload = { action };

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
          message: schedule
            ? `✓ ${schedule.label} scheduled for ${schedule.windowText} (Singapore time). Check Power Automate run history for completion.`
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
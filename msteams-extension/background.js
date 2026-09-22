const allowedActions = new Set([
  "TIME_IN",
  "SNACK",
  "LUNCH",
  "SNACKK",
  "LUNCHH",
  "BACKK"
]);

let sending = false;

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
      chrome.storage.local.get("flowUrl")
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

          body: JSON.stringify({ action }),
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
          message: "✓ Request accepted. Check Power Automate run history for completion."
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
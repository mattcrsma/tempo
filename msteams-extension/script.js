const $ = id => document.getElementById(id);

const statusBox = $("status");
const confirmationDialog = $("confirmationDialog");

let busy = false;
let selectedAction = null;
let themeChanged = false;

const buttonActions = {
  timeInButton: "TIME_IN",
  snackButton: "SNACK",
  lunchButton: "LUNCH",
  snack2Button: "SNACKK",
  lunch2Button: "LUNCHH",
  back2Button: "BACKK"
};

const actionInfo = {
  TIME_IN: {
    title: "Time In?",
    text: "Start your Time In flow?",
    icon: "▶"
  },

  SNACK: {
    title: "Snack Break?",
    text: "Start your 30-minute snack break? Power Automate handles the automatic Back message.",
    icon: "☕"
  },

  LUNCH: {
    title: "Lunch?",
    text: "Start your 1-hour lunch break? Power Automate handles the automatic Back message.",
    icon: "🍱"
  },

  SNACKK: {
    title: "Snack Break (RTO)?",
    text: "Send Snack Break without an automatic Back message?",
    icon: "☕"
  },

  LUNCHH: {
    title: "Lunch (RTO)?",
    text: "Send Lunch without an automatic Back message?",
    icon: "🍱"
  },

  BACKK: {
    title: "Back?",
    text: "Send your Back message?",
    icon: "↩"
  }
};

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

function showStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = `status show ${type}`;
}

function setBusy(value) {
  busy = value;

  for (const id of Object.keys(buttonActions)) {
    $(id).disabled = value;
  }

  $("confirmButton").disabled = value;

  // These controls never depend on the worker being ready.
  $("settingsButton").disabled = false;
  $("themeToggle").disabled = false;
}

function applyTheme(theme) {
  const dark = theme === "dark";

  document.body.classList.toggle("dark", dark);
  $("themeToggle").textContent = dark ? "☀" : "☾";
}

/* OPEN SETTINGS TAB */

$("settingsButton").addEventListener("click", async () => {
  try {
    await withTimeout(
      chrome.runtime.openOptionsPage()
    );
  } catch {
    showStatus(
      "Could not open Settings. Reload Tempo at chrome://extensions.",
      "error"
    );
  }
});

/* THEME */

$("themeToggle").addEventListener("click", async () => {
  themeChanged = true;

  const theme = document.body.classList.contains("dark")
    ? "light"
    : "dark";

  applyTheme(theme);

  try {
    await withTimeout(
      chrome.storage.local.set({
        tempoTheme: theme
      })
    );
  } catch {
    showStatus(
      "Theme changed, but could not be saved.",
      "error"
    );
  }
});

/* CONFIRM ACTION */

for (const [id, action] of Object.entries(buttonActions)) {
  $(id).addEventListener("click", () => {
    if (busy) {
      return;
    }

    selectedAction = action;

    const info = actionInfo[action];

    $("modalTitle").textContent = info.title;
    $("modalText").textContent = info.text;
    $("modalIcon").textContent = info.icon;

    confirmationDialog.showModal();
    $("cancelButton").focus();
  });
}

$("cancelButton").addEventListener("click", () => {
  selectedAction = null;
  confirmationDialog.close();
});

confirmationDialog.addEventListener("cancel", () => {
  selectedAction = null;
});

/* SEND ACTION */

$("confirmButton").addEventListener("click", async () => {
  if (!selectedAction || busy) {
    return;
  }

  const action = selectedAction;
  selectedAction = null;

  confirmationDialog.close();
  setBusy(true);

  showStatus("Sending…");

  try {
    const result = await withTimeout(
      chrome.runtime.sendMessage({
        type: "sendAction",
        action
      }),
      35000
    );

    if (!result || typeof result.message !== "string") {
      throw new Error("No response.");
    }

    showStatus(result.message, result.type);
  } catch {
    showStatus(
      "Could not confirm delivery. Check Power Automate run history before retrying. If there is no run, check Tempo's errors at chrome://extensions.",
      "error"
    );
  } finally {
    setBusy(false);
  }
});

/* CHANGES FROM SETTINGS */

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") {
    return;
  }

  if (changes.tempoTheme) {
    themeChanged = true;
    applyTheme(changes.tempoTheme.newValue || "light");
  }

  if (changes.flowUrl && !busy) {
    showStatus(
      changes.flowUrl.newValue
        ? "✓ HTTP URL updated."
        : "Open ⚙ Settings to connect your Power Automate flow.",
      changes.flowUrl.newValue ? "success" : ""
    );
  }

  if (changes.lastResult?.newValue && !busy) {
    const result = changes.lastResult.newValue;

    showStatus(result.message, result.type);
  }
});

/* STARTUP */

async function initialize() {
  setBusy(false);

  try {
    applyTheme(
      localStorage.getItem("tempoTheme") || "light"
    );
  } catch {
    applyTheme("light");
  }

  try {
    const data = await withTimeout(
      chrome.storage.local.get([
        "tempoTheme",
        "flowUrl",
        "lastResult"
      ])
    );

    if (data.tempoTheme && !themeChanged) {
      applyTheme(data.tempoTheme);
    }

    if (
      busy ||
      confirmationDialog.open ||
      statusBox.textContent
    ) {
      return;
    }

    if (!data.flowUrl) {
      showStatus(
        "Open ⚙ Settings to connect your Power Automate flow."
      );
    } else if (data.lastResult) {
      showStatus(
        `Last request: ${data.lastResult.message}`,
        data.lastResult.type
      );
    }
  } catch {
    if (!busy && !statusBox.textContent) {
      showStatus(
        "Could not load settings. Reload Tempo at chrome://extensions.",
        "error"
      );
    }
  }
}

initialize();
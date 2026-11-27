const $ = id => document.getElementById(id);

const statusBox = $("status");
const confirmationDialog = $("confirmationDialog");

let busy = false;
let selectedAction = null;
let themeChanged = false;

const SHIFT = globalThis.TEMPO_SHIFT;
const MEAL = SHIFT.meal;
const { DURATIONS, resolveTimes, scheduledPlan } = globalThis.TempoSchedule;

let scheduleTimes = resolveTimes(null);

const buttonActions = {
  timeInButton: "TIME_IN",
  snackButton: "SNACK",
  mealButton: MEAL.nowAction,
  learningButton: "LEARNING",
  snack2Button: "SNACKK",
  meal2Button: MEAL.rtoAction,
  back2Button: "BACKK"
};

const fixedActionInfo = {
  TIME_IN: {
    title: "Time In?",
    text: "Send your Time In.",
    icon: "▶"
  },

  SNACK: {
    title: "Snack Break?",
    text: `Snack break now. Back after ${DURATIONS.snack} minutes.`,
    icon: "☕"
  },

  [MEAL.nowAction]: {
    title: `${MEAL.label}?`,
    text: `${MEAL.label} now. Back after 1 hour.`,
    icon: MEAL.icon
  },

  SNACKK: {
    title: "Snack Break (RTO)?",
    text: "Snack break only. No automatic Back.",
    icon: "☕"
  },

  [MEAL.rtoAction]: {
    title: `${MEAL.label} (RTO)?`,
    text: `${MEAL.label} only. No automatic Back.`,
    icon: MEAL.icon
  },

  BACKK: {
    title: "Back?",
    text: "Send Back.",
    icon: "↩"
  },

  LEARNING: {
    title: "Learning Time?",
    text: "Send \"training\", then \"(learning time)\".",
    icon: "📚"
  }
};

// Scheduled actions use the times saved in Settings.
function actionInfo(action) {
  const plan = scheduledPlan(action, scheduleTimes);

  return plan
    ? {
      title: `Schedule ${plan.label}?`,
      text: plan.confirm,
      icon: plan.icon
    }
    : fixedActionInfo[action];
}

// Snack Break, the meal and Learning Time switch to these actions in
// "Scheduled" mode.
const scheduledVariants = {
  SNACK: "SNACK_SCHED",
  [MEAL.nowAction]: MEAL.scheduledAction,
  LEARNING: "LEARNING_SCHED"
};

const nowText = {
  snackDescription: `${DURATIONS.snack} minute break`,
  mealDescription: "1 hour break",
  learningDescription: "Training, then (learning time)"
};

const scheduledDescriptionAction = {
  snackDescription: "SNACK_SCHED",
  mealDescription: MEAL.scheduledAction,
  learningDescription: "LEARNING_SCHED"
};

let scheduledMode = false;

function renderDescriptions() {
  for (const [id, action] of Object.entries(scheduledDescriptionAction)) {
    $(id).textContent = scheduledMode
      ? `Scheduled ${scheduledPlan(action, scheduleTimes).summary}`
      : nowText[id];
  }
}

function setMode(scheduled) {
  scheduledMode = scheduled;

  renderDescriptions();

  $("modeNow").classList.toggle("active", !scheduled);
  $("modeScheduled").classList.toggle("active", scheduled);
  $("modeNow").setAttribute("aria-pressed", String(!scheduled));
  $("modeScheduled").setAttribute("aria-pressed", String(scheduled));
}

function applyShiftLabels() {
  const toggleText =
    `Applies to Snack Break, ${MEAL.label} and Learning Time`;

  document.title = `Tempo · ${SHIFT.name}`;
  $("shiftBadge").textContent = SHIFT.name;
  $("mealIcon").textContent = MEAL.icon;
  $("mealTitle").textContent = MEAL.label;
  $("meal2Icon").textContent = MEAL.icon;
  $("meal2Title").textContent = `${MEAL.label} (RTO)`;
  $("modeToggle").title = toggleText;
  $("modeToggle").setAttribute("aria-label", toggleText);
}

$("modeNow").addEventListener("click", () => setMode(false));
$("modeScheduled").addEventListener("click", () => setMode(true));

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
  $("modeNow").disabled = value;
  $("modeScheduled").disabled = value;

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

    selectedAction =
      scheduledMode && scheduledVariants[action]
        ? scheduledVariants[action]
        : action;

    const info = actionInfo(selectedAction);

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

  if (changes.scheduleTimes) {
    scheduleTimes = resolveTimes(changes.scheduleTimes.newValue);
    renderDescriptions();
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
  applyShiftLabels();
  setMode(false);
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
        "lastResult",
        "scheduleTimes"
      ])
    );

    scheduleTimes = resolveTimes(data.scheduleTimes);
    renderDescriptions();

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
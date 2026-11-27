const $ = id => document.getElementById(id);

const urlInput = $("flowUrl");
const showButton = $("showUrlButton");
const saveButton = $("saveSettings");
const reloadButton = $("reloadSettings");
const statusBox = $("settingsStatus");

const messageList = $("messageList");
const addMessageButton = $("addMessage");
const saveMessagesButton = $("saveMessages");
const messagesStatusBox = $("messagesStatus");

const scheduleForm = $("scheduleForm");
const saveScheduleButton = $("saveSchedule");
const resetScheduleButton = $("resetSchedule");
const scheduleStatusBox = $("scheduleStatus");

const SHIFT = globalThis.TEMPO_SHIFT;
const {
  DURATIONS,
  formatClock,
  formatRange,
  parseTime,
  resolveTimes,
  validateTimes
} = globalThis.TempoSchedule;

const timeInputs = {
  snack: $("snackTime"),
  meal: $("mealTime"),
  learning: $("learningTime")
};

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 200;

let loading = false;
let saving = false;
let savingMessages = false;
let savingSchedule = false;
let themeChanged = false;

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
  const raw = value.trim();

  if (!raw) {
    return "";
  }

  let url;

  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      "Enter a valid Power Automate HTTP POST URL."
    );
  }

  const allowedHost = [
    ".environment.api.powerplatform.com",
    ".logic.azure.com"
  ].some(suffix => url.hostname.endsWith(suffix));

  if (
    url.protocol !== "https:" ||
    !allowedHost ||
    url.username ||
    url.password ||
    url.port ||
    url.hash
  ) {
    throw new Error(
      "Use an HTTPS Power Automate trigger URL on powerplatform.com or logic.azure.com."
    );
  }

  const validPath =
    /\/workflows\/[^/]+\/triggers\/[^/]+\/paths\/invoke\/?$/.test(
      url.pathname
    );

  if (!validPath || !url.searchParams.get("sig")) {
    throw new Error(
      "Copy the complete HTTP POST URL from the trigger, including its signature. Do not use the flow details link."
    );
  }

  return raw;
}

function showStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = `status show ${type}`;
}

function showMessagesStatus(message, type = "") {
  messagesStatusBox.textContent = message;
  messagesStatusBox.className = `status show ${type}`;
}

function showScheduleStatus(message, type = "") {
  scheduleStatusBox.textContent = message;
  scheduleStatusBox.className = `status show ${type}`;
}

/* BREAK SCHEDULE */

function applyShiftLabels() {
  document.title = `Tempo Settings · ${SHIFT.name}`;
  $("shiftName").textContent = SHIFT.name;

  for (const element of document.querySelectorAll(".meal-name")) {
    element.textContent = SHIFT.meal.label;
  }

  for (const element of document.querySelectorAll(".meal-name-lower")) {
    element.textContent = SHIFT.meal.label.toLowerCase();
  }
}

function setScheduleControlsDisabled(disabled) {
  for (const input of Object.values(timeInputs)) {
    input.disabled = disabled;
  }

  saveScheduleButton.disabled = disabled;
  resetScheduleButton.disabled = disabled;
}

function collectTimes() {
  return Object.fromEntries(
    Object.entries(timeInputs).map(([key, input]) => [key, input.value])
  );
}

// Shows what each time means, e.g. "10:00–10:30 AM".
function renderTimeNotes() {
  const times = collectTimes();
  const snack = parseTime(times.snack);
  const meal = parseTime(times.meal);
  const learning = parseTime(times.learning);
  const defaults = SHIFT.defaultTimes;

  const note = (minutes, text, fallback) =>
    minutes === null ? `Default ${formatClock(parseTime(fallback))}` : text;

  $("snackNote").textContent = note(
    snack,
    `Back at ${formatClock(snack + DURATIONS.snack)}`,
    defaults.snack
  );

  $("mealNote").textContent = note(
    meal,
    `Back at ${formatClock(meal + DURATIONS.meal)}`,
    defaults.meal
  );

  $("learningNote").textContent = note(
    learning,
    meal === null
      ? `${SHIFT.meal.label} time not set`
      : `${SHIFT.meal.label} ${formatRange(meal, meal + DURATIONS.meal)}`,
    defaults.learning
  );
}

function renderTimes(times) {
  for (const [key, input] of Object.entries(timeInputs)) {
    input.value = times[key];
  }

  renderTimeNotes();
}

for (const input of Object.values(timeInputs)) {
  input.addEventListener("input", () => {
    renderTimeNotes();
    showScheduleStatus("Unsaved changes.");
  });
}

resetScheduleButton.addEventListener("click", () => {
  renderTimes(SHIFT.defaultTimes);
  showScheduleStatus(
    "Defaults restored. Click Save schedule to keep them."
  );
});

scheduleForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (
    loading ||
    saving ||
    savingMessages ||
    savingSchedule ||
    saveScheduleButton.disabled
  ) {
    return;
  }

  const times = collectTimes();
  const error = validateTimes(times);

  if (error) {
    showScheduleStatus(error, "error");
    return;
  }

  savingSchedule = true;

  setScheduleControlsDisabled(true);
  reloadButton.disabled = true;

  showScheduleStatus("Saving…");

  try {
    await withTimeout(
      chrome.storage.local.set({
        scheduleTimes: times
      })
    );

    // Read the value back to verify the save.
    const saved = await withTimeout(
      chrome.storage.local.get("scheduleTimes")
    );

    if (
      JSON.stringify(saved.scheduleTimes) !== JSON.stringify(times)
    ) {
      throw new Error("Save verification failed.");
    }

    showScheduleStatus("✓ Break schedule saved.", "success");
  } catch {
    showScheduleStatus(
      "✕ Could not confirm the save. Click Reload saved settings to check the stored times, then try again.",
      "error"
    );
  } finally {
    savingSchedule = false;

    setScheduleControlsDisabled(false);
    reloadButton.disabled = false;
  }
});

/* BYEBYE MESSAGES */

function setMessageControlsDisabled(disabled) {
  saveMessagesButton.disabled = disabled;

  for (const control of messageList.querySelectorAll("input, button")) {
    control.disabled = disabled;
  }

  addMessageButton.disabled =
    disabled || messageList.children.length >= MAX_MESSAGES;
}

function createMessageRow(value = "") {
  const row = document.createElement("div");
  row.className = "message-row";

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.maxLength = MAX_MESSAGE_LENGTH;
  input.placeholder = "e.g. byebye";
  input.autocomplete = "off";
  input.setAttribute("aria-label", "Time In message");

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "secondary-button remove-button";
  removeButton.textContent = "Remove";

  input.addEventListener("input", () => {
    showMessagesStatus("Unsaved changes.");
  });

  removeButton.addEventListener("click", () => {
    row.remove();

    // Always keep one field available to type into.
    if (!messageList.children.length) {
      messageList.append(createMessageRow());
    }

    addMessageButton.disabled =
      messageList.children.length >= MAX_MESSAGES;

    showMessagesStatus("Unsaved changes.");
  });

  row.append(input, removeButton);

  return row;
}

function renderMessages(messages) {
  messageList.replaceChildren();

  const saved = Array.isArray(messages)
    ? messages.filter(text => typeof text === "string")
    : [];

  for (const text of saved.slice(0, MAX_MESSAGES)) {
    messageList.append(createMessageRow(text));
  }

  if (!messageList.children.length) {
    messageList.append(createMessageRow());
  }
}

function collectMessages() {
  return [...messageList.querySelectorAll("input")]
    .map(input => input.value.trim())
    .filter(Boolean);
}

function applyTheme(theme) {
  const dark = theme === "dark";

  document.body.classList.toggle("dark", dark);
  $("themeToggle").textContent = dark ? "☀" : "☾";
}

function hideUrl() {
  urlInput.type = "password";
  showButton.textContent = "Show";
  showButton.setAttribute("aria-pressed", "false");
}

function setControlsDisabled(disabled) {
  urlInput.disabled = disabled;
  showButton.disabled = disabled;
  saveButton.disabled = disabled;
}

/* LOAD SETTINGS */

async function loadSettings() {
  if (loading || saving || savingMessages || savingSchedule) {
    return;
  }

  loading = true;

  setControlsDisabled(true);
  setMessageControlsDisabled(true);
  setScheduleControlsDisabled(true);
  reloadButton.disabled = true;
  hideUrl();

  showStatus("Loading settings…");

  try {
    const data = await withTimeout(
      chrome.storage.local.get([
        "flowUrl",
        "tempoTheme",
        "byebyeMessages",
        "scheduleTimes"
      ])
    );

    urlInput.value = data.flowUrl || "";

    renderMessages(data.byebyeMessages);
    messagesStatusBox.className = "status";

    renderTimes(resolveTimes(data.scheduleTimes));
    scheduleStatusBox.className = "status";

    if (!themeChanged) {
      applyTheme(data.tempoTheme || "light");
    }

    setControlsDisabled(false);
    setMessageControlsDisabled(false);
    setScheduleControlsDisabled(false);

    showStatus(
      data.flowUrl
        ? "Saved settings loaded."
        : "Paste your HTTP POST URL, then click Save changes."
    );
  } catch {
    showStatus(
      "Could not load settings. Click Reload saved settings to try again, or reload Tempo at chrome://extensions.",
      "error"
    );
  } finally {
    loading = false;
    reloadButton.disabled = false;
  }
}

/* SHOW / HIDE */

showButton.addEventListener("click", () => {
  const show = urlInput.type === "password";

  urlInput.type = show ? "text" : "password";
  showButton.textContent = show ? "Hide" : "Show";
  showButton.setAttribute("aria-pressed", String(show));
});

/* UNSAVED CHANGES */

urlInput.addEventListener("input", () => {
  showStatus("Unsaved changes.");
});

/* SAVE SETTINGS */

$("settingsForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (
    loading ||
    saving ||
    savingMessages ||
    savingSchedule ||
    saveButton.disabled
  ) {
    return;
  }

  let flowUrl;

  try {
    flowUrl = validateFlowUrl(urlInput.value);
  } catch (error) {
    showStatus(error.message, "error");
    urlInput.focus();
    return;
  }

  saving = true;

  setControlsDisabled(true);
  reloadButton.disabled = true;

  showStatus("Saving…");

  try {
    await withTimeout(
      chrome.storage.local.set({
        flowUrl
      })
    );

    // Read the value back to verify the save.
    const saved = await withTimeout(
      chrome.storage.local.get("flowUrl")
    );

    if (saved.flowUrl !== flowUrl) {
      throw new Error("Save verification failed.");
    }

    urlInput.value = flowUrl;
    hideUrl();

    showStatus(
      flowUrl
        ? "✓ Settings saved successfully on this browser."
        : "✓ Changes saved. Your HTTP URL has been removed.",
      "success"
    );
  } catch {
    showStatus(
      "✕ Could not confirm the save. Click Reload saved settings to check the stored value, then try again.",
      "error"
    );
  } finally {
    saving = false;

    setControlsDisabled(false);
    reloadButton.disabled = false;
  }
});

/* SAVE MESSAGES */

addMessageButton.addEventListener("click", () => {
  if (messageList.children.length >= MAX_MESSAGES) {
    return;
  }

  const row = createMessageRow();

  messageList.append(row);
  row.querySelector("input").focus();

  addMessageButton.disabled =
    messageList.children.length >= MAX_MESSAGES;
});

$("messagesForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (
    loading ||
    saving ||
    savingMessages ||
    savingSchedule ||
    saveMessagesButton.disabled
  ) {
    return;
  }

  const messages = collectMessages();

  savingMessages = true;

  setMessageControlsDisabled(true);
  reloadButton.disabled = true;

  showMessagesStatus("Saving…");

  try {
    await withTimeout(
      chrome.storage.local.set({
        byebyeMessages: messages
      })
    );

    // Read the value back to verify the save.
    const saved = await withTimeout(
      chrome.storage.local.get("byebyeMessages")
    );

    if (
      JSON.stringify(saved.byebyeMessages) !==
      JSON.stringify(messages)
    ) {
      throw new Error("Save verification failed.");
    }

    renderMessages(messages);

    showMessagesStatus(
      messages.length
        ? `✓ Saved ${messages.length} message${messages.length === 1 ? "" : "s"}.`
        : "✓ Saved. No messages set, so the flow's default text will be used.",
      "success"
    );
  } catch {
    showMessagesStatus(
      "✕ Could not confirm the save. Click Reload saved settings to check the stored messages, then try again.",
      "error"
    );
  } finally {
    savingMessages = false;

    setMessageControlsDisabled(false);
    reloadButton.disabled = false;
  }
});

/* RELOAD */

reloadButton.addEventListener("click", loadSettings);

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

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.tempoTheme) {
    themeChanged = true;
    applyTheme(changes.tempoTheme.newValue || "light");
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    hideUrl();
  }
});

applyShiftLabels();
loadSettings();
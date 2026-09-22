const $ = id => document.getElementById(id);

const urlInput = $("flowUrl");
const showButton = $("showUrlButton");
const saveButton = $("saveSettings");
const reloadButton = $("reloadSettings");
const statusBox = $("settingsStatus");

let loading = false;
let saving = false;
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
  if (loading || saving) {
    return;
  }

  loading = true;

  setControlsDisabled(true);
  reloadButton.disabled = true;
  hideUrl();

  showStatus("Loading settings…");

  try {
    const data = await withTimeout(
      chrome.storage.local.get([
        "flowUrl",
        "tempoTheme"
      ])
    );

    urlInput.value = data.flowUrl || "";

    if (!themeChanged) {
      applyTheme(data.tempoTheme || "light");
    }

    setControlsDisabled(false);

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

  if (loading || saving || saveButton.disabled) {
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

loadSettings();
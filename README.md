# Tempo

A lightweight Chrome extension for triggering work time-entry actions through Microsoft Power Automate.

Tempo provides a simple popup for:

* ▶ Time In
* ☕ Snack Break
* 🍱 Lunch
* ☕ Snack Break (RTO)
* 🍱 Lunch (RTO)
* ↩ Back

The extension sends the selected action to your own Power Automate HTTP endpoint.

## How It Works

```text
Tempo Chrome Extension
        │
        │ HTTP POST
        ▼
Power Automate
        │
        ▼
Your configured work automation
```

Tempo does not contain the actual Power Automate workflow. Each user connects the extension to their own Power Automate flow.

---

# Requirements

* Google Chrome or another Chromium-based browser
* Microsoft 365 account
* Access to Microsoft Power Automate
* Permission to create/use a flow with an HTTP request trigger

---

# Installation

## 1. Download Tempo

Clone this repository:

```bash
git clone https://github.com/YOUR-USERNAME/tempo.git
```

Or download the repository as a ZIP file from GitHub and extract it.

---

## 2. Create your Power Automate flow

Open Microsoft Power Automate and create a new flow.

Use the trigger:

**When an HTTP request is received**

Add the following JSON schema:

```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string"
    }
  },
  "required": [
    "action"
  ]
}
```

Your flow will receive requests such as:

```json
{
  "action": "TIME_IN"
}
```

or:

```json
{
  "action": "SNACK"
}
```

---

# 3. Configure the actions

Tempo sends six possible action values:

| Action    | Description                               |
| --------- | ----------------------------------------- |
| `TIME_IN` | Time In                                   |
| `SNACK`   | 30-minute snack break with automatic Back |
| `LUNCH`   | 1-hour lunch with automatic Back          |
| `SNACKK`  | Standalone snack break                    |
| `LUNCHH`  | Standalone lunch                          |
| `BACKK`   | Standalone Back                           |

Configure your Power Automate flow to perform whatever actions you need for each value.

For example, you can use a **Switch** action based on the incoming `action` value.

---

# 4. Copy your Power Automate HTTP URL

After saving the flow, Power Automate will provide an HTTP POST URL.

Copy that URL.

**Keep this URL private.**

The URL contains an authentication signature that allows requests to trigger your flow.

Do not publish your personal Flow URL on GitHub.

---

# 5. Configure Tempo

Open the Tempo extension settings and paste your Power Automate HTTP URL.

Save the configuration.

The URL will be stored locally in your browser and used when Tempo sends an action.

---

# 6. Install the Chrome extension

Because Tempo is not currently distributed through the Chrome Web Store, you can install it using Chrome Developer Mode.

1. Open Chrome.
2. Go to:

```text
chrome://extensions
```

3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the Tempo project folder.
6. Pin Tempo to your Chrome toolbar.

Tempo should now appear as a browser extension.

---

# Security

Your Power Automate HTTP URL is effectively a secret.

Do not:

* Commit your personal Flow URL to GitHub.
* Share your Flow URL publicly.
* Put your Flow URL in screenshots.
* Post your Flow URL in issues or discussions.

Each user should create and connect their own Power Automate flow.

If a Flow URL is accidentally exposed, regenerate/recreate the HTTP trigger URL in Power Automate.

---

# Privacy

Tempo is designed to send only the selected action to the configured Power Automate endpoint.

The extension does not require a Tempo server.

Your Power Automate flow and any connected Microsoft 365 services are controlled by your own Microsoft account and configuration.

---

# Development

The project currently consists of:

```text
Tempo/
├── images/
│   └── icon.png
├── index.html
├── manifest.json
├── script.js
└── README.md
```

The extension uses:

* HTML
* CSS
* JavaScript
* Chrome Manifest V3
* Microsoft Power Automate HTTP triggers

---

# License

Choose a license for your project before publishing.

For example, you can use the MIT License if you want others to freely use, modify, and redistribute the project.

# Tempo

A lightweight Chrome extension for triggering work time-entry actions through Microsoft Power Automate.

Tempo sends your selected action to your own Power Automate HTTP endpoint. Each user connects their own flow through a Settings tab—no code changes required.

## Features

- ▶ Time In
- ☕ Snack Break with automatic Back after 30 minutes
- 🍱 Lunch with automatic Back after 1 hour
- ☕ Snack Break (RTO), without automatic Back
- 🍱 Lunch (RTO), without automatic Back
- ↩ Standalone Back
- ⚙ Settings tab for your Power Automate HTTP URL
- Masked URL field with Show/Hide
- Local settings storage with save confirmation
- Dark and light modes
- Confirmation before sending an action

Automatic messages and delays are handled by your Power Automate flow.

## Requirements

- Google Chrome
- A Microsoft work account with access to Power Automate and Microsoft Teams
- Permission to create and run the flow
- Licensing that covers the HTTP request trigger and the connectors you use
- A Teams group chat where you can post messages

A Microsoft 365 subscription alone may not cover the premium HTTP request trigger. Check your available Power Automate licensing with your administrator.

## 1. Install Tempo

1. On this GitHub repository, click **Code → Download ZIP**.
2. Extract the ZIP into a permanent folder.
3. Open Chrome and go to:

   ```text
   chrome://extensions
   ```

4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted folder containing `manifest.json`.
7. Open Chrome’s Extensions menu and pin **Tempo**.

Keep the extension folder in its installed location.

## 2. Create your Power Automate flow

Open [Microsoft Power Automate](https://make.powerautomate.com/) and select your environment.

Create an **Instant cloud flow** using:

**When an HTTP request is received**

If the trigger is not available in the initial picker, skip that picker and search for the trigger in the designer.

### Configure the HTTP trigger

For **Who can trigger the flow?**, select **Anyone**, if your organization permits this authentication method.

Tempo uses the signature in the HTTP URL. It does not provide Microsoft sign-in or OAuth tokens for tenant-only or specific-user authentication.

Paste this into **Request Body JSON Schema**:

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

Tempo will send requests such as:

```json
{
  "action": "SNACK"
}
```

### Add Current PH Time

Below the trigger:

1. Add **Data Operation → Compose**.
2. Rename it **Current PH Time**.
3. In **Inputs**, open the **Expression / fx** editor and enter:

```text
convertTimeZone(utcNow(),'UTC','Singapore Standard Time')
```

This uses UTC+8, matching Philippine time.

When entering the expressions in this guide through the Expression editor, paste them without `@` or `@{...}`.

### Add the Switch

Below **Current PH Time**:

1. Add **Control → Switch**.
2. In **On**, use this expression:

```text
triggerBody()?['action']
```

Create these five cases:

| Case | Equals |
| --- | --- |
| Snack Break | `SNACK` |
| Lunch | `LUNCH` |
| Snack Break without automatic Back | `SNACKK` |
| Lunch without automatic Back | `LUNCHH` |
| Back | `BACKK` |

Use the existing **Default** branch for Time In.

Tempo sends `TIME_IN` for its Time In button. Because it does not match one of the five cases, it runs Default. Other unmatched action values also run Default.

## 3. Configure the Teams messages

For each Teams message in the following sections, add:

**Microsoft Teams → Post message in a chat or channel**

Configure:

| Field | Value |
| --- | --- |
| Post as | **User** |
| Post in | **Group chat** |
| Group chat | Select your destination chat |
| Message | Enter the message specified below |

Sign in with your own Teams account. Check the destination on every message action, including copied actions.

### SNACK

Inside the case with **Equals = SNACK**, add:

1. Teams message: `snack break`
2. **Schedule → Delay**
   - Count: `30`
   - Unit: **Minute**
3. Teams message: `back`
4. **Control → Terminate**
   - Status: **Succeeded**

### LUNCH

Inside the case with **Equals = LUNCH**, add:

1. Teams message: `lunch`
2. **Schedule → Delay**
   - Count: `60`
   - Unit: **Minute**
3. Teams message: `back`
4. **Control → Terminate**
   - Status: **Succeeded**

### SNACKK

Inside the case with **Equals = SNACKK**, add one Teams message:

```text
snack break
```

No delay or automatic Back is included.

### LUNCHH

Inside the case with **Equals = LUNCHH**, add one Teams message:

```text
lunch
```

No delay or automatic Back is included.

### BACKK

Inside the case with **Equals = BACKK**, add one Teams message:

```text
back
```

## 4. Configure Time In under Default

Build the following steps inside the Switch’s **Default** branch.

The example schedule uses Philippine time:

| Message | Timing |
| --- | --- |
| `good morning` | When the branch starts |
| `in` | At 6:00 AM if started before then; otherwise immediately |
| `buffer` | After waiting until today’s 2:45 PM |
| `out` | 15 minutes after the buffer message succeeds |
| `byebye` | 10–24 seconds after the out message succeeds |

Adjust the schedule to your own working hours.

### A. Send good morning

Add a Teams message:

```text
good morning
```

### B. Check whether it is before 6:00 AM

Add **Control → Condition**.

Configure:

- Left value, using the Expression editor:

  ```text
  formatDateTime(convertTimeZone(utcNow(),'UTC','Singapore Standard Time'),'HH:mm')
  ```

- Operator: **is less than**
- Right value: `06:00`

### C. If Yes: wait until 6:00 AM, then send in

Inside the **Yes / True** branch:

1. Add **Schedule → Delay until**.
2. For **Timestamp**, use:

```text
convertTimeZone(concat(formatDateTime(convertTimeZone(utcNow(),'UTC','Singapore Standard Time'),'yyyy-MM-dd'),'T06:00:00'),'Singapore Standard Time','UTC')
```

3. Below the delay, add a Teams message:

```text
in
```

### D. If No: send in immediately

Inside the **No / False** branch, add a Teams message:

```text
in
```

### E. Wait until 2:45 PM

Below the entire Condition, outside both branches, add **Schedule → Delay until**.

For **Timestamp**, use:

```text
convertTimeZone(concat(formatDateTime(convertTimeZone(utcNow(),'UTC','Singapore Standard Time'),'yyyy-MM-dd'),'T14:45:00'),'Singapore Standard Time','UTC')
```

### F. Send buffer

Add a Teams message:

```text
buffer
```

### G. Wait 15 minutes

Add **Schedule → Delay**:

- Count: `15`
- Unit: **Minute**

### H. Send out

Add a Teams message:

```text
out
```

### I. Add the final delay

Add **Schedule → Delay**:

- Count, using the Expression editor:

  ```text
  rand(10,25)
  ```

- Unit: **Second**

This selects an integer from 10 through 24. The upper bound is excluded.

### J. Send byebye

Add a Teams message:

```text
byebye
```

Keep the steps sequential, with each step running after the previous step succeeds.

The date expressions target the current Philippine date when evaluated. They do not automatically select the next working day.

## 5. Copy your HTTP POST URL

1. Save the flow and make sure it is turned on.
2. Open the **When an HTTP request is received** trigger.
3. Copy the complete **HTTP POST URL**, including all query parameters.

Use the trigger’s HTTP POST URL—not the flow’s `make.powerautomate.com/.../details` link.

Keep this URL private. Its signature allows requests to trigger your flow.

## 6. Save the URL in Tempo

1. Open the Tempo popup.
2. Click **⚙**, beside the dark/light button.
3. A **Tempo Settings** tab opens.
4. Paste your HTTP POST URL.
5. Click **Save changes**.
6. Wait for:

   ```text
   ✓ Settings saved successfully on this browser.
   ```

The URL is stored in Chrome extension local storage for your current browser profile.

### Settings controls

- **Show / Hide:** reveal or mask the URL.
- **Save changes:** save the URL and verify the stored value.
- **Reload saved settings:** reload the stored value and discard unsaved edits.
- **Clear the field and save:** remove the saved URL.

If saving cannot be confirmed, Tempo displays an error.

Saving validates the URL format and local storage. It does not send a request to your flow.

## 7. Use Tempo

1. Open the extension.
2. Select an action.
3. Review the confirmation.
4. Click **Confirm**.

| Button | Sent action | Flow behavior |
| --- | --- | --- |
| ▶ Time In | `TIME_IN` | Runs the Default branch’s full schedule |
| ☕ Snack Break | `SNACK` | Posts snack break, waits 30 minutes, then posts back |
| 🍱 Lunch | `LUNCH` | Posts lunch, waits 60 minutes, then posts back |
| ☕ Snack Break (RTO) | `SNACKK` | Posts snack break only |
| 🍱 Lunch (RTO) | `LUNCHH` | Posts lunch only |
| ↩ Back | `BACKK` | Posts back only |

A successful HTTP response means the request was accepted. Check Power Automate **Run history** to confirm the later Teams actions completed.

The extension does not need to remain open for a flow that has already started. Power Automate handles the delays and scheduled messages.

Each confirmed click starts another request. Standalone Back does not cancel a pending automatic Back.

## Testing

Use a test group chat when checking the flow for the first time.

1. Select an action in Tempo and confirm it.
2. Open the flow’s **Run history**.
3. Check the incoming `action` value and the branch that ran.
4. Confirm the expected Teams message arrived.

You can temporarily shorten delays to test automatic messages. Restore your intended times afterward.

Time In starts the full schedule, including later buffer, out, and byebye messages.

If delivery cannot be confirmed, inspect run history before retrying. The flow may already have started.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Settings will not open | Confirm `options.html` and `options.js` are present, then reload Tempo. |
| Could not load settings | Reload Tempo at `chrome://extensions`, close old Settings tabs, and reopen Settings. |
| Save cannot be confirmed | Click **Reload saved settings** to check the stored value, then retry if needed. |
| URL rejected | Copy the full signed HTTP POST URL from the trigger. Supported hosts end in `.environment.api.powerplatform.com` or `.logic.azure.com`. |
| HTTP 401 or 403 | Check the current URL and trigger authentication. This version does not provide OAuth sign-in. |
| HTTP 400 | Check the request schema and action values. |
| Delivery cannot be confirmed | Check your connection and Power Automate run history before retrying. |
| Request accepted but no Teams message | Inspect the selected branch, Teams connection, destination chat, and run errors. |
| Missing icon | Confirm the file is `images/icon.png` and all image references use that path. |
| Error mentions `url-validation.js` | You have mixed old and new files. The current version does not use that file or `importScripts()`. Replace the outdated code and reload. |
| Old errors still appear | Clear existing errors, reload Tempo, and check whether a new error appears. |
| Licensing error | Check that your license covers the HTTP trigger and the connectors used by your flow. |

To reload:

1. Open `chrome://extensions`.
2. Find **Tempo**.
3. Click **Reload**.
4. Close and reopen the popup and Settings tab.

Keep the same installation folder when updating. Uninstalling the extension removes its saved local settings.

## Privacy and security

- Each user supplies their own Power Automate HTTP URL.
- No personal HTTP URL is included in the source code.
- The URL, theme preference, and last request result are stored locally using `chrome.storage.local`.
- Tempo does not use Chrome sync storage, analytics, or its own server.
- When an action is confirmed, Tempo sends a JSON body containing the selected action to the saved endpoint.
- Your flow controls any subsequent Teams messages or other processing.
- The extension does not read your tabs or inject scripts into websites.
- Local storage is not encrypted. Masking the URL only hides it on screen.

Do not publish your HTTP URL in source code, screenshots, issues, or flow exports.

If a signed URL is exposed, revoke or regenerate it through Power Automate and update Tempo. Deleting it from a GitHub file does not remove it from Git history.

## Project files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension configuration, permissions, icon, and Settings page |
| `index.html` | Popup layout and styles |
| `script.js` | Popup buttons, confirmations, theme, and Settings navigation |
| `background.js` | Sends requests to the locally saved endpoint |
| `options.html` | Full Settings tab layout and styles |
| `options.js` | URL validation, local saving, and save confirmation |
| `images/icon.png` | Tempo icon |
| `README.md` | Installation and Power Automate setup instructions |

No build command or npm installation is required.

The Power Automate workflow is configured separately by each user. A private flow export, Teams connection, or destination chat is not included in this repository.

## License

See `LICENSE` if one has been added to this repository.

Before distributing the project for reuse, the repository owner should choose and include an appropriate license.

## References

- [Power Automate](https://make.powerautomate.com/)
- [HTTP trigger authentication](https://learn.microsoft.com/en-us/power-automate/oauth-authentication)
- [HTTP request trigger licensing note](https://learn.microsoft.com/en-us/sharepoint/dev/declarative-customization/site-design-trigger-flow-tutorial)
- [Workflow expression functions](https://learn.microsoft.com/en-us/azure/logic-apps/expression-functions-reference)
- [Chrome extension local storage](https://developer.chrome.com/docs/extensions/reference/api/storage)

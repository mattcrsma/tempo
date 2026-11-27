# Tempo

A lightweight Chrome extension for triggering work time-entry actions through Microsoft Power Automate.

Tempo sends your selected action to your own Power Automate HTTP endpoint. Each user connects their own flow through a Settings tab—no code changes required.

This repository holds one extension per shift. Install the one for your shift:

| Folder | Extension name | Shift | Time In schedule |
| --- | --- | --- | --- |
| `timein-morning/` | Tempo Morning | Morning shift | in 6:00 AM · buffer 2:45 PM · out 3:00 PM |
| `timein-mid/` | Tempo Mid | Mid shift | buffer 3:00 PM · in 3:15 PM · buffer 11:45 PM · out 12:00 AM |

Both work the same way. The differences are the meal break (Lunch for morning, Dinner for mid), the default break times, and the Time In schedule in your flow.

## Features

- ▶ Time In
- ☕ Snack Break with automatic Back after 30 minutes
- 🍱 Lunch (morning) or 🍽️ Dinner (mid) with automatic Back after 1 hour
- 📚 Learning Time: sends “training”, then “(learning time)”
- 🕒 **Now / Scheduled** toggle for Snack Break, Lunch/Dinner and Learning Time
  - Scheduled Learning Time starts at its time, pauses for the meal break, then continues
  - Only works if sent before the start time, otherwise Tempo shows an error
- ⏰ **Break schedule** in Settings: choose your own start times for Snack Break, Lunch/Dinner and Learning Time
- ☕ Snack Break (RTO) and 🍱/🍽️ Lunch/Dinner (RTO), without automatic Back
- ↩ Standalone Back
- ⚙ Settings tab for your Power Automate HTTP URL
- 💬 Custom “byebye” messages for Time In, one picked at random
- Masked URL field with Show/Hide
- Local settings storage with save confirmation
- Dark and light modes
- Confirmation before sending an action

Default break times (you can change them in Settings):

| Break | Morning shift | Mid shift |
| --- | --- | --- |
| Snack Break | 10:00–10:30 AM | 6:00–6:30 PM |
| Lunch / Dinner | 1:00–2:00 PM | 8:00–9:00 PM |
| Learning Time | starts 10:00 AM | starts 6:00 PM |

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
6. Select the folder for your shift inside the extracted folder: `timein-morning` or `timein-mid` (the one containing `manifest.json`).
7. Open Chrome’s Extensions menu and pin **Tempo Morning** or **Tempo Mid**.

Keep the extension folder in its installed location.

**Upgrading from an older version?** The extension folder was renamed from `msteams-extension` to `timein-morning`. Remove the old Tempo in `chrome://extensions`, load `timein-morning` with **Load unpacked**, then enter your HTTP URL and byebye messages again in Settings. To use custom break times, also update your flow's scheduled cases (see [Updating a flow built before custom break times](docs/flow-setup-morning.md#updating-a-flow-built-before-custom-break-times)).

## 2. Build your Power Automate flow

Each person builds their own flow. Follow the step-by-step guide for your shift:

| Shift | Guide |
| --- | --- |
| Morning | [docs/flow-setup-morning.md](docs/flow-setup-morning.md) |
| Mid | [docs/flow-setup-mid.md](docs/flow-setup-mid.md) |

The guides cover creating the HTTP trigger, every Switch case, the scheduled cases that follow your **Break schedule**, and the Time In schedule for your shift.

Already have a morning flow from an older version of Tempo? See [Updating a flow built before custom break times](docs/flow-setup-morning.md#updating-a-flow-built-before-custom-break-times).

### What Tempo sends

Tempo sends a small JSON body to your flow. The guides already handle every field.

| Field | Sent with | Meaning |
| --- | --- | --- |
| `action` | every request | Which button was clicked, for example `SNACK` or `DINNER_SCHED` |
| `byebyeMessage` | `TIME_IN` | One of your saved byebye messages. Left out if none are saved. |
| `startAt` | scheduled actions | When the break or Learning Time starts (UTC) |
| `backAt` | scheduled actions | When to post `back` (UTC) |
| `mealAt` | `LEARNING_SCHED` | When Learning Time stops for lunch or dinner (UTC) |

Example:

```json
{
  "action": "LEARNING_SCHED",
  "startAt": "2026-11-27T02:00:00Z",
  "mealAt": "2026-11-27T05:00:00Z",
  "backAt": "2026-11-27T06:00:00Z"
}
```

`02:00:00Z` is 10:00 AM Philippine time.

## 3. Copy your HTTP POST URL

1. Save the flow and make sure it is turned on.
2. Open the **When an HTTP request is received** trigger.
3. Copy the complete **HTTP POST URL**, including all query parameters.

Use the trigger’s HTTP POST URL—not the flow’s `make.powerautomate.com/.../details` link.

Keep this URL private. Its signature allows requests to trigger your flow.

## 4. Save the URL in Tempo

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
- **Reload saved settings:** reload the stored values and discard unsaved edits, including unsaved byebye messages and break times.
- **Clear the field and save:** remove the saved URL.

If saving cannot be confirmed, Tempo displays an error.

Saving validates the URL format and local storage. It does not send a request to your flow.

### Break schedule

**Settings → Break schedule** sets the start times used by **Scheduled** mode, in Philippine time:

| Field | What it sets |
| --- | --- |
| Snack Break | Start of the 30-minute snack break |
| Lunch / Dinner | Start of the 1-hour meal break |
| Learning Time | When scheduled Learning Time starts. It pauses for Lunch/Dinner, then continues. |

1. Change the times.
2. Check the note under each field, e.g. “Back at 10:30 AM”.
3. Click **Save schedule**.

**Reset to defaults** fills in your shift’s default times. Click **Save schedule** to keep them.

Learning Time must start before Lunch/Dinner. Tempo will not save a schedule that breaks this rule.

Your flow must use the times Tempo sends, as set up in the flow guide for your shift. A flow that still has fixed times in its scheduled cases keeps using those, whatever Settings says.

## 5. Use Tempo

1. Open the extension.
2. Select an action.
3. Review the confirmation.
4. Click **Confirm**.

Scheduled actions use your **Break schedule** times.

| Button | Sent action (morning / mid) | Flow behavior |
| --- | --- | --- |
| ▶ Time In | `TIME_IN` | Runs the Default branch’s full schedule |
| ☕ Snack Break | `SNACK` | Posts snack break, waits 30 minutes, then posts back |
| 🍱 Lunch / 🍽️ Dinner | `LUNCH` / `DINNER` | Posts lunch or dinner, waits 60 minutes, then posts back |
| ☕ Snack Break (Scheduled mode) | `SNACK_SCHED` | Waits until the snack time, posts snack break, then posts back 30 minutes later |
| 🍱 Lunch / 🍽️ Dinner (Scheduled mode) | `LUNCH_SCHED` / `DINNER_SCHED` | Waits until the meal time, posts lunch or dinner, then posts back 1 hour later |
| 📚 Learning Time | `LEARNING` | Posts training, waits 3 seconds, then posts (learning time) |
| 📚 Learning Time (Scheduled mode) | `LEARNING_SCHED` | At the learning time posts training and (learning time), at the meal time posts lunch or dinner, 1 hour later posts back, then training and (learning time) again |
| ☕ Snack Break (RTO) | `SNACKK` | Posts snack break only |
| 🍱 Lunch / 🍽️ Dinner (RTO) | `LUNCHH` / `DINNERR` | Posts lunch or dinner only |
| ↩ Back | `BACKK` | Posts back only |

### Now / Scheduled toggle

The toggle beside **Choose an action below** switches the main **Snack Break**, **Lunch/Dinner** and **Learning Time** buttons between:

- **Now:** starts the break immediately.
- **Scheduled:** books the break for its time from **Settings → Break schedule**. The card descriptions change to show the times.

The toggle does not affect Time In or the RTO and Back buttons. It resets to **Now** every time the popup opens.

Scheduled times use Philippine time (UTC+8). They only work if sent **before** the start time. If you confirm one after its start time, Tempo shows a “Too late” message and sends nothing. The flow performs the same check as a safety net, but the popup is where you will see the error.

A successful HTTP response means the request was accepted. Check Power Automate **Run history** to confirm the later Teams actions completed.

The extension does not need to remain open for a flow that has already started. Power Automate handles the delays and scheduled messages.

Each confirmed click starts another request. Standalone Back does not cancel a pending automatic Back.

## 6. Custom byebye messages

In **Settings → Time In messages**, you can save one or more messages for the final “byebye” post.

1. Open the Settings tab.
2. Type a message in the field. Click **+ Add message** to add more.
3. Click **Remove** beside any message you no longer want.
4. Click **Save messages**.

When you press Time In, Tempo picks one saved message at random and sends it with the request. The flow posts it at the end of the schedule.

- With one message, that message is always used.
- With none saved, the flow posts its default `byebye`.
- Limits: up to 20 messages, 200 characters each, plain text only.
- The message is picked when you press Time In, not when the flow posts it.

## Testing

Use a test group chat when checking the flow for the first time.

1. Select an action in Tempo and confirm it.
2. Open the flow’s **Run history**.
3. Check the incoming `action` value and the branch that ran.
4. Confirm the expected Teams message arrived.

You can temporarily shorten delays to test automatic messages. Restore your intended times afterward.

To test custom byebye messages, send a Time In and open the **ByeMsg** step in run history. Its output should be one of your saved messages.

To test Scheduled mode, set a Snack Break time a few minutes ahead in **Settings → Break schedule**, send it, and confirm the flow waits and posts at that time. In run history, the trigger outputs show the `startAt` and `backAt` values Tempo sent. Then try after the start time and confirm Tempo shows the “Too late” message and no run starts.

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
| “Too late to schedule…” | Scheduled actions must be sent before their start time in **Settings → Break schedule** (Philippine time). Switch to **Now** to start immediately, or pick a later time. |
| Flow ignores my Settings times | The flow’s scheduled cases still use fixed times. Follow [Updating a flow built before custom break times](docs/flow-setup-morning.md#updating-a-flow-built-before-custom-break-times). |
| “Learning Time must start before…” | Scheduled Learning Time pauses for the meal break, so its start time must be earlier than Lunch/Dinner. |
| A button runs Time In | Its case is missing from the Switch, so the request fell into Default. Check the case names for your shift (for example `DINNER_SCHED`, not `LUNCH_SCHED`, on mid shift). |
| Byebye always says “byebye” | Check that messages are saved in Settings, that the **ByeMsg** Compose exists, and that the final Teams message uses its **Outputs**. |
| Missing icon | Confirm `images/` contains `icon.png`, `icon16.png`, `icon32.png`, `icon48.png` and `icon128.png`. |
| Old icon or old buttons still show | Chrome may be loading a different copy of the extension. In `chrome://extensions`, click **Details** on Tempo and check that **Source** points to your `timein-morning` or `timein-mid` folder. |
| Error mentions `url-validation.js` | You have mixed old and new files. The current version does not use that file. Replace the outdated code and reload. |
| Error mentions `shift.js` or `schedule.js` | One of these files is missing from the extension folder. Copy the whole `timein-morning` or `timein-mid` folder again and reload. |
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
- The URL, theme preference, saved byebye messages, break schedule, and last request result are stored locally using `chrome.storage.local`.
- Tempo does not use Chrome sync storage, analytics, or its own server.
- When an action is confirmed, Tempo sends a JSON body containing the selected action to the saved endpoint. For Time In, the body also includes one randomly chosen byebye message, if you saved any. Scheduled actions also include their start and back times.
- Your flow controls any subsequent Teams messages or other processing.
- The extension does not read your tabs or inject scripts into websites.
- Local storage is not encrypted. Masking the URL only hides it on screen.

Do not publish your HTTP URL in source code, screenshots, issues, or flow exports.

If a signed URL is exposed, revoke or regenerate it through Power Automate and update Tempo. Deleting it from a GitHub file does not remove it from Git history.

## Project files

```text
tempo/
├── README.md
├── docs/
│   ├── flow-setup-morning.md   Flow guide for morning shift
│   └── flow-setup-mid.md       Flow guide for mid shift
├── timein-morning/      Morning-shift extension (Tempo Morning)
└── timein-mid/          Mid-shift extension (Tempo Mid)
```

Both folders contain the same files. Only `shift.js`, `manifest.json` and the icons differ. When you change shared code, copy it to both folders.

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension name, permissions, icons, and Settings page |
| `shift.js` | Shift settings: shift name, meal break (Lunch or Dinner), action names, and default break times |
| `schedule.js` | Shared time helpers: formats times, checks the break schedule, and builds the timestamps sent to the flow |
| `index.html` | Popup layout and styles |
| `script.js` | Popup buttons, Now/Scheduled toggle, confirmations, theme, and Settings navigation |
| `background.js` | Sends requests to the locally saved endpoint, checks scheduled start times, and picks the byebye message |
| `options.html` | Full Settings tab layout and styles |
| `options.js` | URL validation, break schedule, byebye message list, local saving, and save confirmation |
| `images/icon.png` | Tempo icon used in the popup and Settings page (dark yellow for morning, purple for mid) |
| `images/icon16.png` … `icon128.png` | Toolbar and Extensions page icons at each size |

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

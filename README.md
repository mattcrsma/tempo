# Tempo

A lightweight Chrome extension that sends work time-entry actions to **your own Microsoft Power Automate flow**.

## 1. Download and install

1. On GitHub, select **Code → Download ZIP**, then extract it. Alternatively, clone this repository.
2. Keep the extracted `Tempo` folder somewhere permanent.
3. Open `chrome://extensions` in Chrome.
4. Turn on **Developer mode**.
5. Select **Load unpacked** and choose the folder containing `manifest.json`.
6. Pin **Tempo** from Chrome's Extensions menu.

When updating an existing installation, replace its files and click **Reload** on its extension card. Keep the same folder and installation to retain local settings. Removing the extension removes its saved settings.

## 2. Create your Power Automate flow

These steps reproduce the supplied flow: **HTTP trigger → Current PH Time → Switch**, with five explicit cases and the Time In schedule in **Default**.

You need a Microsoft account with access to Power Automate, an environment where you can create the flow, and licensing that covers the premium HTTP request trigger. A Microsoft 365 subscription alone may not cover it; check with your administrator.

1. Open [Power Automate](https://make.powerautomate.com/), choose your environment, and select **Create → Instant cloud flow**.
2. Name it **Tempo**, select **When an HTTP request is received**, and create the flow. If the trigger is not in the initial list, skip that picker and search for it in the designer.
3. Expand the trigger. For **Who can trigger the flow?**, choose **Anyone**, **only if your organization permits URL-based access**. This version of Tempo sends a signed URL, not a Microsoft OAuth access token. Tenant-only and specific-user authentication are not supported. If policy requires those options, do not weaken it; this extension would need OAuth support before use.
4. Paste this into **Request Body JSON Schema**:

```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string"
    }
  },
  "required": ["action"]
}
```

5. Below the trigger, add **Data Operation → Compose**, rename it **Current PH Time**, and use this expression:

```text
convertTimeZone(utcNow(),'UTC','Singapore Standard Time')
```

This uses UTC+8, matching Philippine time. The supplied flow has this Compose step, but its Switch actions calculate the time again rather than referencing the Compose output.

6. After **Current PH Time**, add **Control → Switch**. In **On**, use this expression:

```text
triggerBody()?['action']
```

7. Add the five cases below. Enter each case value exactly as written. Use the existing **Default** branch for the Time In schedule.

| Case value | Steps to add in that case |
| --- | --- |
| `SNACK` | Your Snack Break action → **Schedule: Delay**, Count `30`, Unit `Minute` → your Back action |
| `LUNCH` | Your Lunch action → **Schedule: Delay**, Count `1`, Unit `Hour` → your Back action |
| `SNACKK` | Your Snack Break action only |
| `LUNCHH` | Your Lunch action only |
| `BACKK` | Your Back action only |

**Default handles Time In:** Tempo sends `TIME_IN`, which does not match the five cases, so Power Automate runs Default. Build the schedule below inside Default. This matches the supplied flow.

**Teams settings for every message:** Add **Microsoft Teams → Post message in a chat or channel**. Set **Post as = User**, **Post in = Group chat**, and select your own destination chat using your own Teams connection. Enter the plain message text from the table or schedule below. Recheck the destination on every copied action. The supplied flow uses these settings; its private chat IDs and connection details are not included here.

For the break cases, use the exact messages `snack break`, `lunch`, and `back`. The supplied `SNACK` and `LUNCH` cases end with **Control → Terminate**, Status **Succeeded**, after their Back message. You can reproduce those final steps. The standalone cases contain just their Teams message.

### Time In schedule

Inside **Default**, add these steps in order:

1. **Teams message:** `good morning`.
2. **Control → Condition:** use the following expression on the left, **is less than** as the operator, and `06:00` on the right:

```text
formatDateTime(convertTimeZone(utcNow(),'UTC','Singapore Standard Time'),'HH:mm')
```

3. In the **Yes/True** branch, add **Schedule → Delay until** with this timestamp expression, then a Teams message containing `in`:

```text
convertTimeZone(concat(formatDateTime(convertTimeZone(utcNow(),'UTC','Singapore Standard Time'),'yyyy-MM-dd'),'T06:00:00'),'Singapore Standard Time','UTC')
```

4. In the **No/False** branch, add a Teams message containing `in` immediately.
5. **Below the whole Condition**, outside both branches, add **Schedule → Delay until** with this timestamp expression:

```text
convertTimeZone(concat(formatDateTime(convertTimeZone(utcNow(),'UTC','Singapore Standard Time'),'yyyy-MM-dd'),'T14:45:00'),'Singapore Standard Time','UTC')
```

6. Add a Teams message containing `buffer`.
7. Add **Schedule → Delay**, Count `15`, Unit **Minute**.
8. Add a Teams message containing `out`.
9. Add **Schedule → Delay**, Count expression `rand(10,25)`, Unit **Second**.
10. Add a Teams message containing `byebye`.

Enter these expressions through the **Expression / fx** editor without `@{...}`. The surrounding `@` syntax belongs to the JSON/code representation. Leave the normal run-after dependency as **is successful**, matching the supplied flow.

| Message | Timing intended by the supplied flow, Philippine time |
| --- | --- |
| `good morning` | Immediately after the case starts |
| `in` | Wait until today's 6:00 AM if before 6:00 AM; otherwise send immediately |
| `buffer` | After the wait targeting today's 2:45 PM |
| `out` | 15 minutes after `buffer` succeeds; approximately 3:00 PM in a normal on-time run |
| `byebye` | 10–24 seconds after `out` succeeds; the upper bound of `rand(10,25)` is excluded |

The schedule uses Philippine time (UTC+8). Users should set the times and destination chats to match their own work schedule. The expressions above reproduce the supplied flow and target the current local date when evaluated.

The delays and scheduled messages run in Power Automate. Closing Tempo does not cancel an already-started flow. Each confirmed click starts another request; check run history before repeating a request whose delivery is uncertain. Standalone Back sends a message and does not cancel a pending automatic Back.

**Finish:** Save the flow and make sure it is turned on.

Open the trigger again and copy the full **HTTP POST URL**. Include every query parameter, including `sig`.

**Use the trigger's HTTP POST URL, not the `make.powerautomate.com/.../details` management link.** Each person must create/configure their own flow and connector connections. The author's private flow and chat IDs are not included in this repository.

## 3. Connect Tempo

1. Open Tempo and click **⚙**, beside the light/dark button.
2. Paste your flow's **HTTP POST URL** into the masked field.
3. Click **Save changes**.
4. Wait for **✓ Settings saved on this browser.**
5. Close and reopen Settings to confirm it persisted. Use **Show/Hide** only when needed.

Saving checks the URL format and verifies local storage. It does **not** trigger your flow or verify that the remote flow works. To remove the URL, clear the field and save.

## 4. Test once

1. Use a test destination or harmless connector step in your flow first.
2. In Tempo, click **Time In → Confirm**.
3. Check the popup result, then open your flow's **Run history**.
4. Confirm that the trigger body contains `{"action":"TIME_IN"}`, that the Default branch ran, and that the destination received the intended result.
5. Test the other cases. For a quick automatic Back check, temporarily shorten the delay to one minute, then restore 30 minutes or one hour. Test the Time In schedule only in your test chat: it includes later buffer/out/byebye messages. Use near-future test times, then restore your intended schedule.

Do not repeatedly click if a request times out: it may already have reached Power Automate. Inspect run history before retrying.

## Buttons

| Button | Sent action | Intended behavior, when configured above |
| --- | --- | --- |
| ▶ Time In | `TIME_IN` | Starts the good morning / in / buffer / out / byebye schedule |
| ☕ Snack Break | `SNACK` | Snack, then automatic Back after 30 minutes |
| 🍱 Lunch | `LUNCH` | Lunch, then automatic Back after 1 hour |
| ☕ Snack Break (RTO) | `SNACKK` | Snack only |
| 🍱 Lunch (RTO) | `LUNCHH` | Lunch only |
| ↩ Back | `BACKK` | Back only |

## Troubleshooting

| Problem | What to check |
| --- | --- |
| URL rejected | Copy the entire HTTP POST URL from the trigger. Supported hosts end in `.environment.api.powerplatform.com` or `.logic.azure.com`; HTTPS and a signature are required. Sovereign-cloud/custom hosts need a reviewed code and manifest update. |
| Could not confirm the save | Close and reopen Settings to check the stored value. Reload the extension if needed and save again. |
| HTTP 401/403 | Check whether the trigger requires OAuth, whether the signed URL is current, and your organization's policies. This version does not sign in to Microsoft. |
| HTTP 404/410 | Verify the flow still exists and is enabled. Copy its current HTTP POST URL again. |
| HTTP 400 | Check the trigger schema and case values. |
| Delivery could not be confirmed | Check connection, browser extension site permissions, trigger URL, and run history. A timeout does not prove the action failed. |
| Accepted, but no message/time entry | Inspect the Switch case, connector sign-in, destination, and errors in run history. |
| No automatic Back | Add Delay and Back to `SNACK`/`LUNCH`. RTO buttons intentionally send standalone actions. |
| Premium/license error | Ask your administrator for licensing that covers this HTTP-triggered flow and its connectors. |

## Privacy and security

- No personal Flow URL is bundled in the extension.
- The URL, theme, and last request status are stored in `chrome.storage.local` on the current browser profile. Tempo does not use Chrome sync storage or its own server.
- Local storage is **not encrypted**. Masking the input hides it on screen; it does not encrypt it. Someone with access to the browser profile may read it.
- A signed HTTP URL is a secret: anyone holding it can trigger a flow configured for Anyone. Never publish it in source, screenshots, issues, or flow exports. If exposed, revoke/regenerate the trigger's signature or replace the trigger/flow and verify the old URL no longer works.
- When you confirm an action, Tempo sends `{"action":"..."}` to the saved endpoint. Normal network metadata also reaches Microsoft. Your flow controls any further processing and messages.
- Saving settings makes no network request. No analytics or automatic request retries are included.
- Host permissions cover the supported Power Automate endpoint domains; the extension sends only to the endpoint you save. It does not read your tabs or inject content scripts.

## Publish on GitHub

1. Create a new empty repository named **tempo** in your GitHub account. Choose **Public** if you want everyone to access it.
2. Select **uploading an existing file** (or **Add file → Upload files**) and upload the contents of this `Tempo` folder. Put `manifest.json` at the repository root; do not upload only the ZIP.
3. Commit the files. Do not upload your original script containing your private URL, screenshots of it, or an unreviewed Power Automate export.
4. Add a license before sharing if you want to grant reuse rights. For example, use GitHub's **Add file → Create new file → LICENSE → Choose a license template → MIT License** and enter your copyright details. No license was selected automatically for you.
5. Share your repository URL. Other users follow steps 1–4 above with their own flow.

If the old URL was already committed, deleting the line is insufficient because Git history retains it. Revoke the exposed URL first and clean the repository history as needed.

## Files

- `manifest.json` — Chrome Manifest V3 configuration and permissions
- `index.html` — popup, appearance, settings and confirmation dialogs
- `script.js` — popup controls and local settings
- `url-validation.js` — supported trigger URL validation
- `background.js` — HTTP requests independent of popup lifetime
- `README.md` — installation and Power Automate setup

The supplied source referenced an `images/icon.png` that was not included. That missing reference has been removed so the extension loads; the popup retains its original T branding. No build command or npm installation is needed.

## References

- [Microsoft: HTTP trigger authentication](https://learn.microsoft.com/en-us/power-automate/oauth-authentication)
- [Microsoft: HTTP request trigger and licensing note](https://learn.microsoft.com/en-us/sharepoint/dev/declarative-customization/site-design-trigger-flow-tutorial)
- [Chrome: extension storage](https://developer.chrome.com/docs/extensions/reference/api/storage)

- [Microsoft: expression functions, including rand](https://learn.microsoft.com/en-us/azure/logic-apps/expression-functions-reference#rand)

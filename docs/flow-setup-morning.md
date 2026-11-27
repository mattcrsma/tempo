# Tempo Morning: build your Power Automate flow

This guide walks you through building the Power Automate flow that **Tempo Morning** talks to. When you click a button in Tempo, this flow posts the matching message (`in`, `snack break`, `back`, and so on) to Teams for you.

**Time needed:** about 45 minutes. Most of it is adding Teams messages.

**Using mid shift?** Follow [flow-setup-mid.md](flow-setup-mid.md) instead.

## What the finished flow does

| Tempo button | What gets posted |
| --- | --- |
| Time In | `good morning`, `in` at 6:00 AM, `buffer` at 2:45 PM, `out` at 3:00 PM, then your byebye message |
| Snack Break | `snack break`, then `back` 30 minutes later |
| Lunch | `lunch`, then `back` 1 hour later |
| Learning Time | `training`, then `(learning time)` |
| Snack Break / Lunch / Learning Time in **Scheduled** mode | The same messages, at the times you set in Tempo's Settings |
| Snack Break (RTO) / Lunch (RTO) | `snack break` or `lunch` only, no automatic `back` |
| Back | `back` |

## Before you start

You need:

- **Tempo Morning** installed in Chrome (see the main [README](../README.md#1-install-tempo)).
- A Microsoft work account that can use Power Automate and Teams.
- A Power Automate license that includes the **HTTP request** trigger. If you can't find the trigger in step 1, ask your administrator.
- The Teams group chats you post in:
  - **Attendance chat:** where `in`, `out`, `buffer`, breaks and `back` go.
  - **Team chat:** where `good morning` and `byebye` go.

  If you post everything in one chat, choose that chat everywhere this guide says "Team chat".

## How to do common things in the designer

Come back to this section whenever a step says "add a Teams message", "enter an expression" and so on.

### Add a step

Click the **+** below a step (or inside a branch), choose **Add an action**, search for the action name, and select it.

### Add a Teams message

1. Add the action **Post message in a chat or channel** (Microsoft Teams).
2. Fill in:

   | Field | Value |
   | --- | --- |
   | Post as | **User** |
   | Post in | **Group chat** |
   | Group chat | Your **Attendance chat**, unless the step says Team chat |
   | Message | The text the step gives, for example `snack break` |

3. The first time, sign in to Teams when asked.

**Shortcut:** to make another Teams message, click **⋯** on an existing one → **Copy to my clipboard**. Then click **+** where you want it → **Paste an action**. The chat stays selected, so you only change the Message.

### Enter an expression

Some fields need an expression (a small formula) instead of plain text.

1. Click in the field.
2. Click the **fx** button that appears next to it (or type `/` and choose **Insert expression**).
3. Paste the expression exactly as shown in this guide.
4. Click **Add**.

Don't type expressions straight into the field, and don't add an `@` in front.

### Add a delay

- **Delay:** waits a fixed amount of time. Search **Delay** (Schedule). Set **Count** and **Unit**.
- **Delay until:** waits until a time. Search **Delay until** (Schedule). Set **Timestamp**, usually with an expression.

### Rename a step

Click the step, then click its name at the top of the panel and type the new name. Only one step in this guide needs a specific name: **ByeMsg** in step 5.

## Step 1: Create the flow and its trigger

1. Go to [make.powerautomate.com](https://make.powerautomate.com/).
2. Click **Create** → **Instant cloud flow**.
3. Name it `Tempo Morning`.
4. Choose the trigger **When an HTTP request is received** and click **Create**.
   If it isn't in the list, click **Skip**, then search for it in the designer.
5. Click the trigger to open it and set:
   - **Who can trigger the flow?** → **Anyone**
   - **Request Body JSON Schema** → paste this:

```json
{
  "type": "object",
  "properties": {
    "action": { "type": "string" },
    "byebyeMessage": { "type": "string" },
    "startAt": { "type": "string" },
    "mealAt": { "type": "string" },
    "backAt": { "type": "string" }
  },
  "required": ["action"]
}
```

Tempo uses a private link with a signature to start the flow. It doesn't sign in with your Microsoft account, which is why the trigger is set to **Anyone**. If your organization doesn't allow **Anyone**, Tempo can't be used with your flow.

## Step 2: Add the Switch

The Switch reads which button you clicked and runs the matching branch.

1. Under the trigger, add the action **Switch** (Control).
2. In **On**, enter this expression:

   ```text
   triggerBody()?['action']
   ```

3. Add nine cases. Click **+ Add case** for each one and type the value in **Equals**:

   | Case | Equals |
   | --- | --- |
   | 1 | `SNACK` |
   | 2 | `LUNCH` |
   | 3 | `SNACK_SCHED` |
   | 4 | `LUNCH_SCHED` |
   | 5 | `LEARNING` |
   | 6 | `LEARNING_SCHED` |
   | 7 | `SNACKK` |
   | 8 | `LUNCHH` |
   | 9 | `BACKK` |

   Type them exactly, in capitals. Rename each case to something readable if you like, for example "Snack Break".

4. Leave the **Default** branch for now. It becomes Time In in step 5.

**Build every case.** If one is missing, its button runs Time In by mistake.

## Step 3: Fill in the simple cases

Add these steps **inside** each case, in order.

### SNACK

1. Teams message: `snack break`
2. **Delay**: Count `30`, Unit **Minute**
3. Teams message: `back`

### LUNCH

1. Teams message: `lunch`
2. **Delay**: Count `60`, Unit **Minute**
3. Teams message: `back`

### LEARNING

1. Teams message: `training`
2. **Delay**: Count `3`, Unit **Second**
3. Teams message: `(learning time)`

### SNACKK

1. Teams message: `snack break`

### LUNCHH

1. Teams message: `lunch`

### BACKK

1. Teams message: `back`

## Step 4: Fill in the scheduled cases

Scheduled mode uses the times you set in **Tempo → ⚙ Settings → Break schedule**. Tempo sends those times with each request, and these steps wait for them. You won't need to edit the flow when you change a time.

Each scheduled case starts with the same **Condition**. It checks that the request arrived before the start time.

**To set up the Condition:**

1. Add the action **Condition** (Control).
2. Left box, as an expression:

   ```text
   ticks(utcNow())
   ```

3. Middle: **is less than**
4. Right box, as an expression:

   ```text
   ticks(triggerBody()?['startAt'])
   ```

The Condition has two branches: **True** and **False**.

### SNACK_SCHED

Add the Condition above, then:

**True** branch:

1. **Delay until**, Timestamp as an expression:

   ```text
   triggerBody()?['startAt']
   ```

2. Teams message: `snack break`
3. **Delay until**, Timestamp as an expression:

   ```text
   triggerBody()?['backAt']
   ```

4. Teams message: `back`

**False** branch:

1. **Terminate** (Control): Status **Failed**, Code `TooLate`, Message `Scheduled snack break was sent after its start time.`

### LUNCH_SCHED

The same as SNACK_SCHED, except the first Teams message is `lunch`, and the Terminate message is `Scheduled lunch was sent after its start time.`

### LEARNING_SCHED

Add the Condition above, then:

**True** branch, in this order:

1. **Delay until**, Timestamp: `triggerBody()?['startAt']`
2. Teams message: `training`
3. **Delay**: Count `3`, Unit **Second**
4. Teams message: `(learning time)`
5. **Delay until**, Timestamp: `triggerBody()?['mealAt']`
6. Teams message: `lunch`
7. **Delay until**, Timestamp: `triggerBody()?['backAt']`
8. Teams message: `back`
9. **Delay**: Count `2`, Unit **Second**
10. Teams message: `training`
11. **Delay**: Count `3`, Unit **Second**
12. Teams message: `(learning time)`

Enter every Timestamp as an expression.

**False** branch:

1. **Terminate**: Status **Failed**, Code `TooLate`, Message `Scheduled learning time was sent after its start time.`

## Step 5: Build Time In (the Default branch)

Time In runs the whole day's schedule. Add these steps inside **Default**, in this order:

| # | Step | Details |
| --- | --- | --- |
| 1 | Teams message (**Team chat**) | `good morning` |
| 2 | **Condition** | See below. Checks whether it is before 6:00 AM. |
| 3 | Teams message | `in` (below the Condition, not inside it) |
| 4 | **Delay until** | Wait until 2:45 PM. See below. |
| 5 | Teams message | `buffer` |
| 6 | **Delay** | Count `15`, Unit **Minute** |
| 7 | Teams message | `out` |
| 8 | **Delay** | Count as an expression: `rand(10,25)`. Unit **Second**. |
| 9 | **Compose**, renamed **ByeMsg** | See below. Picks your byebye text. |
| 10 | Teams message (**Team chat**) | See below. Posts the byebye text. |

**Step 2, the Condition:**

- Left box, as an expression:

  ```text
  formatDateTime(convertTimeZone(utcNow(),'UTC','Singapore Standard Time'),'HH:mm')
  ```

- Middle: **is less than**
- Right box, plain text: `06:00`
- **True** branch: add **Delay until** with this Timestamp expression:

  ```text
  convertTimeZone(concat(formatDateTime(convertTimeZone(utcNow(),'UTC','Singapore Standard Time'),'yyyy-MM-dd'),'T06:00:00'),'Singapore Standard Time','UTC')
  ```

- **False** branch: leave it empty.

Step 3 (`in`) goes **below** the whole Condition, so it posts at 6:00 AM if you clicked early, or straight away if you clicked after 6:00. Hover over the line below the Condition box and click **+** there, not inside True or False.

**Step 4, Delay until 2:45 PM.** Timestamp expression:

```text
convertTimeZone(concat(formatDateTime(convertTimeZone(utcNow(),'UTC','Singapore Standard Time'),'yyyy-MM-dd'),'T14:45:00'),'Singapore Standard Time','UTC')
```

**Step 9, ByeMsg:**

1. Add **Compose** (Data Operation).
2. Rename the step to `ByeMsg`.
3. In **Inputs**, enter this expression:

   ```text
   if(empty(triggerBody()?['byebyeMessage']),'byebye',triggerBody()?['byebyeMessage'])
   ```

This uses a byebye message you saved in Tempo's Settings, or `byebye` if you haven't saved any. Don't type `ByeMsg` into Inputs. That would post the word "ByeMsg".

**Step 10, byebye:** add a Teams message to your **Team chat**. In **Message**, don't type text. Type `/` (or click the lightning icon) and choose **Outputs** under **ByeMsg**.

## Step 6: Save and connect Tempo

1. Click **Save** at the top. Make sure the flow is **On**.
2. Open the trigger (**When an HTTP request is received**) and copy the **HTTP URL**. It only appears after saving.
3. In Chrome, click **Tempo Morning** → **⚙** → paste the URL → **Save changes**.
4. Optional: in the same Settings tab, check **Break schedule** and add byebye messages under **Time In messages**.

Keep the HTTP URL private. Anyone with it can start your flow. If it leaks, delete the trigger, add it again, and paste the new URL into Tempo.

## Step 7: Test it

Use a test chat the first time if you can.

1. In Tempo, click **Back** → **Confirm**. `back` should appear in your Attendance chat within a few seconds.
2. In Power Automate, open the flow → **Run history** → the latest run. Green ticks mean each step worked.
3. Test Scheduled mode: in Settings, set Snack Break 2–3 minutes ahead and save. Switch Tempo to **Scheduled**, click **Snack Break**, and confirm. `snack break` should post at that time and `back` 30 minutes later. Cancel the run from Run history if you don't want to wait.

**Careful:** Time In runs the whole day, through to byebye at about 3:00 PM. Only test it on a real workday, or cancel the run afterwards.

## If something goes wrong

| Problem | Fix |
| --- | --- |
| A button ran Time In instead | That case is missing or misspelled in the Switch. Check the Equals values in step 2. |
| Byebye posts "ByeMsg" | The ByeMsg Compose has the text `ByeMsg` in Inputs. Replace it with the expression in step 5. |
| `in` never posts when Time In is clicked after 6:00 AM | `in` is inside the Condition's True branch. Move it below the Condition. |
| Scheduled break posts at the wrong time | The scheduled case still has a fixed time. Check that every Delay until uses `startAt`, `mealAt` or `backAt`. |
| Tempo says "Too late to schedule…" | The start time in Settings has already passed today. Use **Now**, or pick a later time. |
| HTTP 401 or 403 in Tempo | Copy the HTTP URL from the trigger again and save it in Tempo. |

## Updating a flow built before custom break times

If your flow's scheduled cases have fixed times (Conditions comparing to `10:00` or `13:00`, or Delay until expressions ending in `T10:00:00`), update them so they follow Tempo's Settings:

1. Replace the trigger's **Request Body JSON Schema** with the one in step 1.
2. In **SNACK_SCHED**, **LUNCH_SCHED** and **LEARNING_SCHED**:
   - Change the Condition to `ticks(utcNow())` **is less than** `ticks(triggerBody()?['startAt'])`.
   - Change the first **Delay until** Timestamp to `triggerBody()?['startAt']`.
3. In **SNACK_SCHED** and **LUNCH_SCHED**, delete the **Delay** (30 or 60 minutes) before `back` and add **Delay until** `triggerBody()?['backAt']` in its place.
4. In **LEARNING_SCHED**, change the **Delay until** before `lunch` to `triggerBody()?['mealAt']`. Then replace the 60-minute **Delay** before `back` with **Delay until** `triggerBody()?['backAt']`.
5. Check Time In against step 5, especially the **ByeMsg** step and where `in` sits.
6. Save, then run the scheduled test in step 7.

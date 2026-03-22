# US-018: Shift State Transitions

## User Story

**As a** system
**I want to** automatically manage shift state transitions based on business rules
**So that** shifts accurately reflect their current operational status without manual intervention

---

## Actors

- **Primary Actor:** System (automated process)
- **Secondary Actor:** Manager (oversight and manual override)
- **Tertiary Actor:** Bartender (triggers report completion)

---

## Preconditions

1. Shifts exist in the system with a valid status
2. Shift records include maximum bartender capacity, scheduled start time, and assigned bartenders

---

## Main Flow

### Transition: Open -> Full
1. A bartender is assigned to a shift
2. System checks if the number of assigned bartenders equals the shift's maximum capacity
3. If maximum is reached, system automatically transitions the shift status to "full"

### Transition: Open/Full -> Running
4. System monitors the current time against shift scheduled start times
5. When the current time reaches a shift's start time, system transitions the shift to "running"
6. This applies to both "open" and "full" shifts

### Transition: Running -> Closed
7. A bartender submits the completed shift report
8. System validates the report is complete
9. System transitions the shift status to "closed"

**Decision (2026-03-22):** A shift closes only when a report is submitted. End time passing does not auto-close a shift. A running shift with no report stays "running" indefinitely until a report is filed.

---

## Alternative Flows

### AF-1: Full -> Open (Bartender Removed)
- A bartender is removed from a "full" shift
- System detects the bartender count is now below maximum capacity
- System transitions the shift back to "open"

### AF-2: Running Shift Without Full Staff
- A shift transitions to "running" while still in "open" status (not fully staffed)
- System allows the shift to run with available bartenders
- Manager is notified that the shift started understaffed

### AF-3: Manual Override by Manager
- Manager manually changes a shift's status
- System logs the manual override
- Business rules for automated transitions continue from the new state

### AF-4: Report Not Submitted
- Shift end time passes without a report submission
- Shift remains in "running" status indefinitely — this is by design
- A running shift with no report is visible to managers as overdue in the shift management view

---

## Postconditions

### Success
- Shift status accurately reflects the current operational state
- All transitions are logged for audit purposes
- Dependent systems (calendar display, notifications) reflect the updated status

### Failure
- Shift remains in its current state if a transition fails
- System logs the failed transition attempt
- Manager is notified of the issue

---

## Data Requirements

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| Shift ID | uuid | Yes | Must reference an existing shift |
| Current Status | string | Yes | One of: open, full, running, closed |
| Max Bartenders | number | Yes | Positive integer |
| Assigned Bartenders Count | number | Yes | >= 0 |
| Scheduled Start Time | timestamp | Yes | Valid datetime |
| Scheduled End Time | timestamp | Yes | Valid datetime, after start time |
| Report Submitted | boolean | Yes | Indicates if report is complete |

---

## UI/UX Notes

- Status changes should be reflected in real-time on the calendar view
- Color-coding for each status: open (green), full (blue), running (orange), closed (gray)
- Manager should see a clear indication of current shift status
- Transition history could be viewable in shift details

---

## Technical Notes

- Open -> Full: triggered synchronously when bartender assignment changes (DB state column written)
- Open/Full -> Running: **derived at read time — DB state column is never written with 'running'**
  - A `start_at timestamptz` column was added via migration and is auto-maintained by a DB trigger
  - `computeEffectiveState(shift)` utility returns `'running'` when `start_at <= now()` and stored state is `'open'` or `'full'`
  - Applied in the GET shifts handler before the response is returned
  - No cron job, no Edge Function — option A (derived status at read time) was selected after architectural review
- Running -> Closed: triggered when report is submitted via API (DB state column written)
- State machine pattern enforced in application layer for all writes; invalid transitions rejected
- All state-writing transitions are atomic database operations
- The `'running'` value remains in the DB ENUM for compatibility but is never written by application code

---

## Acceptance Criteria

- [ ] Shift automatically transitions from "open" to "full" when max bartenders are assigned
- [ ] Shift automatically transitions back from "full" to "open" when a bartender is removed
- [ ] Shift automatically transitions to "running" at the scheduled start time
- [ ] Shift transitions to "closed" when the shift report is submitted
- [ ] Invalid state transitions are rejected
- [ ] Understaffed shifts can still transition to "running"
- [ ] Manager is notified of understaffed running shifts
- [ ] All state transitions are logged
- [ ] Calendar view reflects status changes in real-time

# US-006: Cancel Shift Signup

## User Story

**As a** bartender
**I want to** cancel my signup for a future shift
**So that** I can free up my schedule and allow another bartender to take the shift

---

## Actors

- **Primary Actor:** Bartender (authenticated)
- **Secondary Actor:** System (Supabase Database)

---

## Preconditions

1. User is logged in as a bartender
2. Bartender is currently signed up for the shift
3. The shift is in the future (not running or closed)

---

## Main Flow

1. Bartender views their upcoming shifts (US-005) or a shift detail view
2. Bartender clicks the "ביטול הרשמה" (Cancel Signup) button
3. System displays a Hebrew confirmation dialog (e.g., "האם אתה בטוח שברצונך לבטל את ההרשמה למשמרת?")
4. Bartender confirms the cancellation
5. System deletes the assignment record
6. System displays a Hebrew success message (e.g., "ההרשמה בוטלה בהצלחה")
7. If the shift was "full", system updates status back to "open"
8. System removes the shift from the bartender's "My Shifts" view

---

## Alternative Flows

### AF-1: Bartender Declines Confirmation

1. Bartender clicks "ביטול הרשמה"
2. Confirmation dialog appears
3. Bartender clicks "לא" (No) or closes the dialog
4. No changes are made; bartender remains signed up

### AF-2: Shift is Already Running or Closed

1. Bartender attempts to cancel a shift that has already started or ended
2. System rejects the request
3. System displays an error in Hebrew (e.g., "לא ניתן לבטל הרשמה למשמרת שכבר התחילה")

---

## Postconditions

### Success
- Assignment record is deleted from the database
- Shift's available spots count increases by one
- If shift was "full", status reverts to "open"
- Shift no longer appears in bartender's "My Shifts"

### Failure
- Assignment record remains unchanged
- Error message displayed in Hebrew

---

## Data Requirements

| Field        | Type | Required | Validation Rules                           |
|--------------|------|----------|--------------------------------------------|
| shift_id     | UUID | Yes      | Must reference an existing shift            |
| bartender_id | UUID | Yes      | Must match the authenticated bartender      |

---

## UI/UX Notes

- Cancel button visible on shift detail or "My Shifts" view
- Hebrew button text: "ביטול הרשמה"
- Confirmation dialog in Hebrew with "כן" (Yes) and "לא" (No) buttons
- Success/error messages in Hebrew
- RTL layout

---

## Technical Notes

- API route: `DELETE /api/shifts/[id]` or dedicated cancellation endpoint
- Deletes the row from `shift_assignments` table
- Server-side check that the shift hasn't started yet
- After deletion, recalculate if shift status should change from "full" to "open"
- Supabase RLS ensures bartenders can only cancel their own signups

---

## Acceptance Criteria

- [x] ~~Bartender can cancel their signup for a future shift~~
- [x] ~~A Hebrew confirmation dialog is shown before cancellation~~
- [x] ~~Cancellation removes the assignment from the database~~
- [x] ~~Available spots count updates after cancellation~~
- [x] ~~Shift status reverts from "full" to "open" if applicable~~
- [x] ~~Cannot cancel signup for a running or closed shift~~
- [x] ~~Success message displayed in Hebrew after cancellation~~

# US-011: Edit Existing Shift

## User Story

**As a** manager
**I want to** edit the details of an existing shift
**So that** I can correct or update shift information as needed

---

## Actors

- **Primary Actor:** Manager (authenticated)
- **Secondary Actor:** System (Supabase Database)

---

## Preconditions

1. User is logged in as a manager
2. The shift exists in the system
3. The shift has status "open" or "full" (not "running" or "closed")

---

## Main Flow

1. Manager views a shift in the shifts management page
2. Manager clicks the "ערוך" (Edit) button on the shift
3. System displays the edit form dialog pre-populated with the shift's current values
4. Manager modifies the desired fields:
   - Date
   - Start time
   - End time
   - Location
   - Maximum number of bartenders
5. Manager clicks "שמור" (Save)
6. System validates all fields
7. System updates the shift record in the database
8. System displays a Hebrew success message (e.g., "המשמרת עודכנה בהצלחה")
9. The updated shift details are reflected in all views

---

## Alternative Flows

### AF-1: Shift is Running or Closed

1. Manager attempts to edit a shift with status "running" or "closed"
2. System prevents editing and displays a message in Hebrew (e.g., "לא ניתן לערוך משמרת שכבר התחילה או הסתיימה")
3. Edit button is disabled or hidden for such shifts

### AF-2: Reducing Max Bartenders Below Current Signups

1. Manager tries to set max_bartenders to a number less than the current number of signups
2. System displays a validation error in Hebrew (e.g., "לא ניתן להקטין את מספר הברמנים מתחת למספר הנרשמים הנוכחי")
3. Form remains open for correction

### AF-3: Manager Cancels Edit

1. Manager clicks "ביטול" (Cancel) or closes the dialog
2. No changes are saved
3. Manager returns to the shifts view

### AF-4: Validation Errors

1. Manager submits invalid data (e.g., end time before start time)
2. System displays Hebrew validation errors
3. Form remains open for correction

### AF-5: Manager Removes a Registered Bartender

**Scope note: v.1 supports removal only. Manual assignment of a bartender by a manager (without their sign-up) is deferred to v.2.**

1. Manager opens the edit form for an open or full shift
2. The edit form displays the list of currently registered bartenders beneath the shift details fields
3. Manager clicks the "הסר" (Remove) button next to a bartender's name
4. System removes the bartender from the shift's assignment list (`shift_assignments`)
5. If the shift was "full" and capacity becomes available, the shift status reverts to "open"
6. System displays a Hebrew confirmation (e.g., "הברמן הוסר מהמשמרת")
7. The updated bartender list and shift status are reflected immediately in the form and all views

---

## Postconditions

### Success
- Shift record is updated in the database
- Updated details are reflected in all views (bartender calendar, manager dashboard)
- Assigned bartenders see the updated shift information

### Failure
- Shift record remains unchanged
- Validation errors displayed in Hebrew
- Form remains open for correction

---

## Data Requirements

| Field          | Type    | Required | Validation Rules                              |
|----------------|---------|----------|-----------------------------------------------|
| shift_id       | UUID    | Yes      | Must reference an existing shift               |
| date           | date    | Yes      | Valid date                                     |
| start_time     | time    | Yes      | Valid time format                              |
| end_time       | time    | Yes      | Must be after start_time                       |
| location       | string  | Yes      | Non-empty string                               |
| max_bartenders | integer | Yes      | Positive integer, >= current number of signups |
| bartender_id   | UUID    | No       | Required when removing a bartender; must reference an existing assignment on this shift |

---

## UI/UX Notes

- Edit form displayed as a dialog/modal, same layout as creation form (US-010)
- Form pre-populated with current shift values
- All labels in Hebrew: "תאריך", "שעת התחלה", "שעת סיום", "מיקום", "מספר ברמנים מקסימלי"
- "שמור" (Save) and "ביטול" (Cancel) buttons
- Edit button hidden/disabled for running or closed shifts
- RTL layout throughout
- Inline validation with Hebrew error messages
- Below the shift details fields, a section titled "ברמנים רשומים" (Registered Bartenders) lists each registered bartender's name with a "הסר" (Remove) button
- Remove action is immediate (no separate save step); reflects inline in the list
- If no bartenders are registered, the section shows "אין ברמנים רשומים"

---

## Technical Notes

- API route: `PUT /api/shifts/[id]`
- API route for removing a bartender: `DELETE /api/shifts/[id]/bartenders/[userId]`
- Server-side validation of all fields including max_bartenders vs current signups
- Only managers can edit shifts (enforced via Supabase RLS and API middleware)
- Shift status check performed server-side before allowing update
- If max_bartenders is increased and shift was "full", status may revert to "open"
- If max_bartenders is decreased to equal current signups, status becomes "full"
- Removing a bartender deletes the corresponding row from `shift_assignments`; if shift was "full" it transitions back to "open"

---

## Acceptance Criteria

- [x] ~~Manager can open an edit form for an existing shift~~
- [x] ~~Form is pre-populated with the shift's current values~~
- [x] ~~Manager can modify date, time, location, and max bartenders~~
- [x] ~~Validation prevents invalid submissions (missing fields, bad time range)~~
- [x] ~~Cannot edit shifts with status "running" or "closed"~~
- [x] ~~Cannot reduce max bartenders below current number of signups~~
- [x] ~~Successful update shows a Hebrew success message~~
- [x] ~~Updated details reflected in bartender and manager views~~
- [x] ~~UI is in Hebrew with RTL layout~~
- [ ] Edit form shows the list of currently registered bartenders
- [ ] Manager can remove any registered bartender via a remove button
- [ ] Removing a bartender updates the list immediately without closing the dialog
- [ ] If removing a bartender causes capacity to free up on a "full" shift, shift status reverts to "open"
- [ ] Bartender list section is hidden for running or closed shifts

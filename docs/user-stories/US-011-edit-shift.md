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

---

## UI/UX Notes

- Edit form displayed as a dialog/modal, same layout as creation form (US-010)
- Form pre-populated with current shift values
- All labels in Hebrew: "תאריך", "שעת התחלה", "שעת סיום", "מיקום", "מספר ברמנים מקסימלי"
- "שמור" (Save) and "ביטול" (Cancel) buttons
- Edit button hidden/disabled for running or closed shifts
- RTL layout throughout
- Inline validation with Hebrew error messages

---

## Technical Notes

- API route: `PUT /api/shifts/[id]`
- Server-side validation of all fields including max_bartenders vs current signups
- Only managers can edit shifts (enforced via Supabase RLS and API middleware)
- Shift status check performed server-side before allowing update
- If max_bartenders is increased and shift was "full", status may revert to "open"
- If max_bartenders is decreased to equal current signups, status becomes "full"

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

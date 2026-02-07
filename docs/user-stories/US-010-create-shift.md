# US-010: Create New Shift

## User Story

**As a** manager
**I want to** create a new shift with date, time, location, and capacity
**So that** bartenders can view and sign up for it

---

## Actors

- **Primary Actor:** Manager (authenticated)
- **Secondary Actor:** System (Supabase Database)

---

## Preconditions

1. User is logged in as a manager
2. Manager has access to the shift management interface

---

## Main Flow

1. Manager navigates to the shifts management page
2. Manager clicks the "משמרת חדשה" (New Shift) button
3. System displays a Hebrew form dialog with shift fields
4. Manager fills in the shift details:
   - Date
   - Start time
   - End time
   - Location
   - Maximum number of bartenders
5. Manager clicks "שמור" (Save)
6. System validates all required fields
7. System creates the shift record with status "open"
8. System displays a Hebrew success message (e.g., "המשמרת נוצרה בהצלחה")
9. The new shift appears in the shifts calendar/list

---

## Alternative Flows

### AF-1: Missing Required Fields

1. Manager submits the form with missing fields
2. System highlights the missing fields with Hebrew error messages
3. Form remains open for correction

### AF-2: Invalid Time Range

1. Manager enters an end time that is before the start time
2. System displays a validation error in Hebrew (e.g., "שעת הסיום חייבת להיות אחרי שעת ההתחלה")
3. Form remains open for correction

### AF-3: Manager Cancels Form

1. Manager clicks "ביטול" (Cancel) or closes the dialog
2. No shift is created
3. Manager returns to the shifts view

---

## Postconditions

### Success
- New shift record is created in the database with status "open"
- Shift is visible to bartenders in the available shifts view (US-003)
- Shift appears in the manager's shift management view

### Failure
- No shift record is created
- Validation errors displayed in Hebrew
- Form remains open for correction

---

## Data Requirements

| Field          | Type    | Required | Validation Rules                          |
|----------------|---------|----------|-------------------------------------------|
| date           | date    | Yes      | Valid date, typically future               |
| start_time     | time    | Yes      | Valid time format                          |
| end_time       | time    | Yes      | Must be after start_time                   |
| location       | string  | Yes      | Non-empty string                           |
| max_bartenders | integer | Yes      | Positive integer (minimum 1)               |
| status         | string  | Yes      | Auto-set to "open" on creation             |
| created_by     | UUID    | Yes      | Auto-set to the authenticated manager's ID |

---

## UI/UX Notes

- Form displayed as a dialog/modal
- All labels in Hebrew: "תאריך", "שעת התחלה", "שעת סיום", "מיקום", "מספר ברמנים מקסימלי"
- Date picker component for date selection
- Time picker components for start/end times
- Number input for max bartenders
- "שמור" (Save) and "ביטול" (Cancel) buttons
- RTL layout throughout
- Inline validation with Hebrew error messages

---

## Technical Notes

- API route: `POST /api/shifts`
- Shift created in Supabase `shifts` table
- Status auto-set to "open"
- Server-side validation of all fields
- Only managers can create shifts (enforced via Supabase RLS and API middleware)
- `created_by` field set from the authenticated user's ID

---

## Acceptance Criteria

- [x] ~~Manager can open a "New Shift" form dialog~~
- [x] ~~Form includes fields for date, start time, end time, location, and max bartenders~~
- [x] ~~All form labels and messages are in Hebrew~~
- [x] ~~Validation prevents submission with missing required fields~~
- [x] ~~Validation ensures end time is after start time~~
- [x] ~~Successful creation saves the shift with status "open"~~
- [x] ~~New shift is visible in the calendar/list for bartenders~~
- [x] ~~Success message displayed in Hebrew after creation~~

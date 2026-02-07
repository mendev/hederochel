# US-020: Shift Detail Page

## User Story

**As a** user (manager or bartender)
**I want to** view a detailed page for a single shift
**So that** I can see all relevant information including shift details, assigned bartenders, and report status in one place

---

## Actors

- **Primary Actor:** User (Manager or Bartender)
- **Secondary Actor:** System (Supabase backend)

---

## Preconditions

1. User is logged in
2. The shift exists in the system
3. User has permission to view the shift (managers can view all; bartenders can view their assigned shifts)

---

## Main Flow

1. User clicks on a shift from the calendar or shifts list
2. System navigates to the shift detail page
3. System displays shift information:
   - Date and time (start and end)
   - Current status (open, full, running, closed)
   - Maximum bartender capacity
4. System displays assigned bartenders:
   - List of bartender names
   - Number of assigned vs. maximum capacity
5. System displays report status:
   - Whether a report has been submitted
   - Link to view the report (if completed)
   - Link to fill out the report (if shift is running and user is assigned)

---

## Alternative Flows

### AF-1: Manager View
- Manager sees additional actions:
  - Edit shift details
  - Delete shift (if status allows)
  - Assign/remove bartenders
  - View/download report

### AF-2: Bartender View
- Bartender sees:
  - Shift details (read-only)
  - Their own assignment status
  - Report submission button (if shift is running)

### AF-3: Shift Not Found
- **At step 2:** If the shift ID is invalid or deleted
- System displays: "המשמרת לא נמצאה" (Shift not found)
- User is redirected back to the shifts list

---

## Postconditions

### Success
- User sees complete shift information
- Actions available are appropriate for the user's role and shift status

### Failure
- Error message is displayed if shift data cannot be loaded
- User is redirected to the shifts list

---

## Data Requirements

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| Shift ID | uuid | Yes | Must reference an existing shift |
| Shift Date | date | Yes | Valid date |
| Start Time | string | Yes | Valid time |
| End Time | string | Yes | Valid time, after start time |
| Status | string | Yes | One of: open, full, running, closed |
| Max Bartenders | number | Yes | Positive integer |
| Assigned Bartenders | array | No | List of bartender profiles |
| Report | object | No | Associated report if exists |

---

## UI/UX Notes

- All text is displayed in Hebrew (RTL layout)
- Clean, card-based layout for shift information sections
- Status displayed with color-coded badge
- Bartender list shows profile names clearly
- Report section visually indicates completion status
- Action buttons are contextual based on role and shift status
- Back navigation to calendar/list view

---

## Technical Notes

- Route: `/shifts/[id]`
- API endpoint: GET `/api/shifts/[id]` with joined data (bartenders, report)
- Role-based rendering for manager vs. bartender actions
- Server-side authorization check for bartender access
- Consider using Supabase real-time for live status updates

---

## Acceptance Criteria

- [ ] User can navigate to a shift detail page from the calendar
- [ ] Shift date, time, and status are displayed
- [ ] Assigned bartenders are listed with count vs. capacity
- [ ] Report status is shown (submitted, pending, or not started)
- [ ] Manager can access edit and delete actions from the detail page
- [ ] Bartender can access report submission from the detail page
- [ ] Invalid shift IDs show a "not found" message
- [ ] Role-appropriate actions are displayed for each user type

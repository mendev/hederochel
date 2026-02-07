# US-013: View All Shifts

## User Story

**As a** manager
**I want to** view all shifts regardless of their status
**So that** I can have a complete overview of past, present, and future shifts

---

## Actors

- **Primary Actor:** Manager
- **Secondary Actor:** System (Supabase backend)

---

## Preconditions

1. Manager is logged in with a manager role
2. Shifts exist in the system

---

## Main Flow

1. Manager navigates to the shifts page
2. System displays all shifts in a calendar view
3. Shifts are color-coded or labeled by status (open, full, running, closed)
4. Manager can filter shifts by status, date range, or assigned bartender
5. Manager can navigate between months/weeks on the calendar
6. Manager clicks on a shift to view its details

---

## Alternative Flows

### AF-1: No Shifts Exist
- **At step 2:** If no shifts are found matching the current view/filters
- System displays an empty state message: "אין משמרות להצגה" (No shifts to display)

### AF-2: Filter Applied
- **At step 4:** Manager applies a filter
- Calendar updates to show only shifts matching the filter criteria

---

## Postconditions

### Success
- Manager sees all shifts displayed on the calendar
- Shifts are accurately represented with their current status

### Failure
- Error message is displayed if shifts cannot be loaded
- Manager is informed of the issue

---

## Data Requirements

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| Shift Date | date | Yes | Valid date |
| Shift Status | string | Yes | One of: open, full, running, closed |
| Assigned Bartenders | array | No | List of bartender profiles |
| Shift Time | string | Yes | Start and end time |

---

## UI/UX Notes

- All text is displayed in Hebrew (RTL layout)
- Calendar view is the primary display format
- Status colors provide quick visual identification of shift states
- Filters should be easily accessible and intuitive
- Calendar navigation (month/week) should be smooth

---

## Technical Notes

- API endpoint: GET `/api/shifts` with optional query parameters for filtering
- Data is fetched from Supabase with joins on bartender assignments
- Calendar component renders shifts on their scheduled dates
- Client-side filtering for responsive interaction

---

## Acceptance Criteria

- [x] ~~Manager can view all shifts on a calendar~~
- [x] ~~Shifts display their status visually (color-coding or labels)~~
- [x] ~~Manager can filter shifts by status~~
- [x] ~~Manager can navigate between months/weeks~~
- [x] ~~Manager can click a shift to see its details~~
- [x] ~~Empty state is displayed when no shifts match the view~~
- [x] ~~All shift statuses are represented: open, full, running, closed~~

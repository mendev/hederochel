# US-005: View My Upcoming Shifts

## User Story

**As a** bartender
**I want to** view my upcoming shifts
**So that** I can know when and where I'm scheduled to work

---

## Actors

- **Primary Actor:** Bartender (authenticated)
- **Secondary Actor:** System (Supabase Database)

---

## Preconditions

1. User is logged in as a bartender
2. Bartender has signed up for at least one shift

---

## Main Flow

1. Bartender navigates to the "המשמרות שלי" (My Shifts) page
2. System fetches all shifts assigned to the current bartender
3. System displays the shifts in a calendar and/or list view
4. Each shift shows: date, time, location, and status
5. Bartender can browse through upcoming dates
6. Bartender clicks a shift row — system opens the shift detail popup showing the same information as the calendar shift popup (see US-020)

---

## Alternative Flows

### AF-1: No Upcoming Shifts

1. Bartender has no shifts assigned
2. System displays an empty state message in Hebrew (e.g., "אין משמרות קרובות")
3. Optionally, a link to view available shifts (US-003) is provided

### AF-2: Switch Between Calendar and List View

1. Bartender toggles between calendar view and list view
2. System re-renders the same data in the selected format

---

## Postconditions

### Success
- Bartender sees all their upcoming shifts with relevant details
- Shifts are ordered chronologically

### Failure
- If data fails to load, an error message is shown in Hebrew
- Page shows empty state

---

## Data Requirements

| Field       | Type     | Required | Validation Rules                    |
|-------------|----------|----------|-------------------------------------|
| shift_id    | UUID     | Yes      | Unique identifier                   |
| date        | date     | Yes      | Valid date                          |
| start_time  | time     | Yes      | Valid time format                   |
| end_time    | time     | Yes      | Must be after start_time            |
| location    | string   | Yes      | Non-empty                           |
| status      | string   | Yes      | "open", "full", "running", "closed" |

---

## UI/UX Notes

- Page title: "המשמרות שלי"
- RTL layout with Hebrew labels
- Calendar view highlights dates with assigned shifts
- List view shows shifts as cards or rows sorted by date
- Each shift card shows date, time range, and location
- Option to cancel signup from this view (links to US-006)

---

## Technical Notes

- API route: `GET /api/shifts` filtered by current user's assignments
- Query joins `shifts` table with `shift_assignments` on bartender_id
- Only future shifts shown by default (past shifts handled in US-009)
- Uses Supabase RLS to ensure bartenders only see their own assignments

---

## Acceptance Criteria

- [x] ~~Bartender can view a list/calendar of their upcoming shifts~~
- [x] ~~Each shift displays date, time, location, and status~~
- [x] ~~Shifts are sorted chronologically~~
- [x] ~~Empty state message shown when no shifts are assigned~~
- [ ] Bartender can click a shift to see full details in a popup (shift detail popup — see US-020)
- [x] ~~UI is in Hebrew with RTL layout~~

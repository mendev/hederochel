# US-003: View Available Open Shifts

## User Story

**As a** bartender
**I want to** view available open shifts in a calendar view
**So that** I can find shifts I'd like to sign up for

---

## Actors

- **Primary Actor:** Bartender (authenticated)
- **Secondary Actor:** System (Supabase Database)

---

## Preconditions

1. User is logged in as a bartender
2. There are shifts in the system with status "open"

---

## Main Flow

1. Bartender navigates to the shifts calendar page
2. System fetches all shifts with status "open" from the database
3. System displays shifts in a calendar view
4. Each shift entry shows key details: date, time, location, and available spots
5. Bartender can browse through dates (navigate months/weeks)
6. Bartender can click on a shift to view its full details

---

## Alternative Flows

### AF-1: No Available Shifts

1. System fetches shifts but none are available
2. System displays the empty calendar with no shift entries
3. Bartender sees an indication that there are no open shifts

### AF-2: Shift is Full

1. A shift has reached its maximum number of bartenders
2. The shift is still visible but marked as full (cannot sign up)
3. Bartender can still view shift details but not sign up

---

## Postconditions

### Success
- Bartender sees a calendar populated with open shifts
- Each shift displays date, time, location, and number of available spots
- Bartender can navigate between dates

### Failure
- If data fails to load, an error message is shown in Hebrew
- Calendar is displayed but empty

---

## Data Requirements

| Field           | Type     | Required | Validation Rules                      |
|-----------------|----------|----------|---------------------------------------|
| shift_id        | UUID     | Yes      | Unique identifier                     |
| date            | date     | Yes      | Must be a valid date                  |
| start_time      | time     | Yes      | Valid time format                     |
| end_time        | time     | Yes      | Must be after start_time              |
| location        | string   | Yes      | Non-empty                             |
| max_bartenders  | integer  | Yes      | Positive integer                      |
| current_signups | integer  | Yes      | Computed from assignments             |
| status          | string   | Yes      | "open", "full", "running", "closed"   |

---

## UI/UX Notes

- Calendar component displays shifts visually by date
- Hebrew labels throughout (e.g., "משמרות פתוחות", "מיקום", "שעה")
- RTL layout
- Shifts show a brief summary on the calendar tile
- Clicking a shift opens a detail view or dialog
- Color coding for shift status (e.g., green for open, grey for full)

---

## Technical Notes

- Data fetched from Supabase `shifts` table with related bartender assignments
- Available spots calculated as `max_bartenders - current_signups`
- Calendar component renders shifts per date
- API route: `GET /api/shifts` with appropriate filters

---

## Acceptance Criteria

- [x] ~~Bartender can view a calendar of open shifts~~
- [x] ~~Each shift displays date, time, location, and available spots~~
- [x] ~~Bartender can navigate between months/weeks~~
- [x] ~~Clicking a shift shows its full details~~
- [x] ~~Full shifts are visually distinguished from open ones~~
- [x] ~~UI is in Hebrew with RTL layout~~
- [x] ~~Only shifts with status "open" or "full" are shown to bartenders~~

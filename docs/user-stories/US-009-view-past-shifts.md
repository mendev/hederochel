# US-009: View Past Shifts

## User Story

**As a** bartender
**I want to** view shifts I've worked in the past
**So that** I can review my work history and access associated reports

---

## Actors

- **Primary Actor:** Bartender (authenticated)
- **Secondary Actor:** System (Supabase Database)

---

## Preconditions

1. User is logged in as a bartender
2. Bartender has been assigned to shifts that have already ended

---

## Main Flow

1. Bartender navigates to a "היסטוריית משמרות" (Shift History) section
2. System fetches all past shifts assigned to the current bartender
3. System displays the shifts in a list, ordered by date (most recent first)
4. Each shift shows: date, time, location, and status ("closed" or "running" if recently ended)
5. Bartender can click on a past shift to view its details
6. If a report exists for the shift, bartender can view the completed report in read-only mode

---

## Alternative Flows

### AF-1: No Past Shifts

1. Bartender has no completed or past shifts
2. System displays an empty state message in Hebrew (e.g., "אין משמרות קודמות")

### AF-2: View Associated Report

1. Bartender clicks on a past shift that has a completed report
2. System opens the report in read-only mode
3. Bartender can review all completed tasks and their responses

### AF-3: Past Shift Without Report

1. Bartender clicks on a past shift that has no report (e.g., report feature wasn't available)
2. System shows shift details but indicates no report exists (e.g., "לא קיים דו״ח למשמרת זו")

---

## Postconditions

### Success
- Bartender sees a chronological list of their past shifts
- Bartender can access read-only reports for completed shifts

### Failure
- If data fails to load, an error message is shown in Hebrew
- Page shows empty state

---

## Data Requirements

| Field       | Type     | Required | Validation Rules                    |
|-------------|----------|----------|-------------------------------------|
| shift_id    | UUID     | Yes      | Unique identifier                   |
| date        | date     | Yes      | Must be in the past                 |
| start_time  | time     | Yes      | Valid time format                   |
| end_time    | time     | Yes      | Valid time format                   |
| location    | string   | Yes      | Non-empty                           |
| status      | string   | Yes      | Typically "closed"                  |
| report_id   | UUID     | No       | References associated report if any |

---

## UI/UX Notes

- Section title: "היסטוריית משמרות"
- List view with shift cards showing date, time, location
- Each card indicates whether a report exists (icon or badge)
- Clicking a shift opens a detail view with optional report link
- RTL layout with Hebrew labels
- Pagination or infinite scroll for long histories

---

## Technical Notes

- API route: `GET /api/shifts` filtered by bartender assignment and past date
- Query: shifts where `date < today` and bartender is assigned
- Join with `reports` table to check for associated report
- Reports displayed in read-only mode (no edit permissions)
- Supabase RLS ensures bartenders only see their own history

---

## Acceptance Criteria

- [ ] Bartender can view a list of their past shifts
- [ ] Past shifts are ordered by date (most recent first)
- [ ] Each shift shows date, time, location, and status
- [ ] Bartender can click a shift to view its details
- [ ] Associated reports are accessible in read-only mode
- [ ] Empty state message shown when no past shifts exist
- [ ] UI is in Hebrew with RTL layout

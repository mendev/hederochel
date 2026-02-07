# US-017: View Completed Reports

## User Story

**As a** manager
**I want to** view completed shift reports
**So that** I can analyze bartender performance, track task completion, and identify operational issues

---

## Actors

- **Primary Actor:** Manager
- **Secondary Actor:** System (Supabase backend)

---

## Preconditions

1. Manager is logged in with a manager role
2. At least one completed report exists in the system

---

## Main Flow

1. Manager navigates to the reports page
2. System displays a list of completed reports
3. Manager applies filters to narrow results (date range, shift, bartender)
4. Manager clicks on a report to view its full details
5. System displays the report including:
   - Shift date and time
   - Assigned bartender(s)
   - Task checklist with completion status
   - Text notes and comments
   - Submission timestamp

---

## Alternative Flows

### AF-1: No Reports Found
- **At step 2:** If no completed reports exist or match the applied filters
- System displays: "לא נמצאו דוחות" (No reports found)

### AF-2: Filter by Date Range
- **At step 3:** Manager selects a start and end date
- System filters reports to show only those within the selected range

### AF-3: Filter by Bartender
- **At step 3:** Manager selects a bartender from a dropdown
- System filters reports to show only those submitted by the selected bartender

### AF-4: Filter by Shift
- **At step 3:** Manager selects a specific shift
- System filters reports associated with that shift

---

## Postconditions

### Success
- Manager can view report details for analysis
- Filters are applied correctly and results are accurate

### Failure
- Error message is displayed if reports cannot be loaded
- Manager is informed of the issue

---

## Data Requirements

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| Report ID | uuid | Yes | Must reference an existing report |
| Shift ID | uuid | Yes | Associated shift |
| Bartender ID | uuid | Yes | User who submitted the report |
| Tasks | array | Yes | List of tasks with completion status |
| Notes | string | No | Free-text notes |
| Submitted At | timestamp | Yes | When the report was submitted |
| Filter: Date From | date | No | Valid date |
| Filter: Date To | date | No | Valid date, >= Date From |
| Filter: Bartender | uuid | No | Must reference an existing user |

---

## UI/UX Notes

- All text is displayed in Hebrew (RTL layout)
- Reports list should show key info at a glance: date, bartender, completion percentage
- Filters should be collapsible or in a sidebar
- Report detail view should clearly show completed vs. incomplete tasks
- Consider export functionality (future enhancement)

---

## Technical Notes

- API endpoint: GET `/api/reports` with query parameters for filtering
- Reports are joined with shifts and profiles for display data
- Pagination may be needed for large datasets
- Server-side filtering for performance

---

## Acceptance Criteria

- [ ] Manager can view a list of completed reports
- [ ] Manager can filter reports by date range
- [ ] Manager can filter reports by bartender
- [ ] Manager can filter reports by shift
- [ ] Manager can click a report to view full details
- [ ] Report details show task completion status
- [ ] Report details show text notes and comments
- [ ] Empty state is displayed when no reports match filters

# US-008: Complete Report Tasks

## User Story

**As a** bartender working a running shift
**I want to** complete tasks in the active shift report
**So that** I can track my work and fulfill all shift requirements

---

## Actors

- **Primary Actor:** Bartender (authenticated, assigned to the shift)
- **Secondary Actor:** System (Supabase Database)

---

## Preconditions

1. User is logged in as a bartender
2. Bartender is assigned to the running shift
3. A report exists for the shift (created via US-007)
4. The report status is "in_progress"

---

## Main Flow

1. Bartender opens the active shift report (US-007)
2. System displays all tasks with their current state
3. For each task, bartender can:
   - Check/uncheck a checkbox for boolean tasks
   - Enter text in text fields for descriptive tasks
   - Select options for multiple-choice tasks
4. System auto-saves progress as the bartender completes tasks
5. Bartender can see a progress indicator updating in real-time
6. When all required tasks are completed, bartender clicks "סיים דו״ח" (Complete Report)
7. System validates all required tasks are filled
8. System marks the report as "completed"
9. System displays a Hebrew success message (e.g., "הדו״ח הושלם בהצלחה")

---

## Alternative Flows

### AF-1: Partial Completion (Save Progress)

1. Bartender completes some but not all tasks
2. System auto-saves the current progress
3. Bartender can return later during the shift to continue
4. Previously completed tasks retain their values

### AF-2: Attempt to Complete with Missing Required Tasks

1. Bartender clicks "סיים דו״ח" but required tasks are incomplete
2. System highlights the missing tasks in red
3. System displays an error in Hebrew (e.g., "יש להשלים את כל המשימות הנדרשות")
4. Report remains in "in_progress" status

### AF-3: Shift Ends Before Report Completion

1. The shift time window passes while report is still in progress
2. System keeps the report accessible for a grace period
3. Manager can view the incomplete report

---

## Postconditions

### Success
- All task responses are saved in the database
- Report status is updated to "completed"
- Shift status transitions to "closed" (if report completion triggers it)
- Manager can view the completed report

### Failure
- Partial progress is saved (auto-save)
- Report remains in "in_progress" status
- Error messages displayed in Hebrew

---

## Data Requirements

| Field          | Type     | Required | Validation Rules                        |
|----------------|----------|----------|-----------------------------------------|
| task_id        | UUID     | Yes      | References the task in the report       |
| report_id      | UUID     | Yes      | References the parent report            |
| task_type      | string   | Yes      | "checkbox", "text", "select"            |
| value          | string   | No       | Depends on task_type                    |
| is_completed   | boolean  | Yes      | Whether the task has been addressed     |
| completed_by   | UUID     | No       | References the bartender who completed  |
| completed_at   | datetime | No       | Timestamp of completion                 |
| is_required    | boolean  | Yes      | From template; must be filled to finish |

---

## UI/UX Notes

- Tasks displayed as a scrollable list/form
- Checkbox tasks: standard checkbox with Hebrew label
- Text tasks: text input or textarea with Hebrew placeholder
- Select tasks: dropdown with Hebrew options
- Progress bar or fraction display (e.g., "7/10 משימות הושלמו")
- Auto-save indicator (e.g., "נשמר" with a small checkmark)
- "סיים דו״ח" button at the bottom, enabled only when all required tasks done
- RTL layout throughout
- Required tasks marked with an asterisk (*)

---

## Technical Notes

- API route: `PUT /api/shifts/[id]/report` to update task values
- Auto-save via debounced API calls on each task change
- Task responses stored in a `report_tasks` or `task_responses` table
- Server-side validation of required tasks before marking report complete
- Completing the report may trigger shift status change to "closed"
- Supabase RLS ensures only assigned bartenders can edit the report

---

## Acceptance Criteria

- [ ] Bartender can check/uncheck checkbox tasks
- [ ] Bartender can enter text in text field tasks
- [ ] Bartender can select options in select tasks
- [ ] Progress is auto-saved as tasks are completed
- [ ] Progress indicator shows completion fraction
- [ ] Cannot finalize report with incomplete required tasks
- [ ] Completing all tasks and clicking "סיים דו״ח" marks report as completed
- [ ] Completed report updates the shift status to "closed"
- [ ] UI is in Hebrew with RTL layout
- [ ] Previously saved progress is loaded when reopening the report

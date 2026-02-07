# US-021: Report Filling Interface

## User Story

**As a** bartender
**I want to** fill out a shift report through a dedicated interface
**So that** I can document completed tasks, add notes, save my progress, and submit the report when finished

---

## Actors

- **Primary Actor:** Bartender
- **Secondary Actor:** System (Supabase backend)
- **Tertiary Actor:** Manager (reviews submitted reports)

---

## Preconditions

1. Bartender is logged in
2. Bartender is assigned to the shift
3. The shift is in "running" status
4. A task template is associated with the shift

---

## Main Flow

1. Bartender navigates to the shift detail page or clicks "מלא דוח" (Fill Report)
2. System displays the report filling interface
3. System loads the task checklist from the associated task template
4. Bartender works through the task list:
   - Checks off completed tasks
   - Adds text notes for individual tasks (optional)
5. Bartender adds general notes/comments in a free-text area
6. Bartender clicks "שמור טיוטה" (Save Draft) to save progress
7. System saves the current state without submitting
8. When all required tasks are done, bartender clicks "שלח דוח" (Submit Report)
9. System validates the report is complete
10. System saves and marks the report as submitted
11. System transitions the shift status to "closed"
12. Success message is displayed

---

## Alternative Flows

### AF-1: Save Draft and Continue Later
- **At step 6:** Bartender saves a draft and navigates away
- Later, bartender returns to the report
- System loads the saved draft with all previous progress intact

### AF-2: Incomplete Submission Attempt
- **At step 9:** If required tasks are not completed
- System displays: "יש להשלים את כל המשימות הנדרשות לפני שליחה" (All required tasks must be completed before submission)
- Bartender remains on the report to complete missing tasks

### AF-3: Report Already Submitted
- **At step 2:** If a report has already been submitted for this shift
- System displays the submitted report in read-only mode
- No further edits are allowed

### AF-4: Network Error During Save
- **At step 7 or 10:** If a network error occurs
- System displays: "שגיאה בשמירה. נסה שוב" (Error saving. Try again)
- Data is preserved locally until successful save

---

## Postconditions

### Success
- Report is saved (draft or submitted) in the database
- If submitted: shift transitions to "closed" status
- Manager can view the completed report

### Failure
- Draft is preserved locally if save fails
- Report remains in its previous state (draft or not started)
- Error message is displayed to the bartender

---

## Data Requirements

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| Report ID | uuid | Yes (auto) | Auto-generated |
| Shift ID | uuid | Yes | Must reference a running shift |
| Bartender ID | uuid | Yes | Must be assigned to the shift |
| Template ID | uuid | Yes | Task template used |
| Tasks | array | Yes | List of task entries |
| Task ID | uuid | Yes | References a template task |
| Task Completed | boolean | Yes | Checkbox state |
| Task Notes | string | No | Optional per-task notes |
| General Notes | string | No | Free-text comments |
| Status | string | Yes | "draft" or "submitted" |
| Saved At | timestamp | Yes (auto) | Last save timestamp |
| Submitted At | timestamp | No | Set upon submission |

---

## UI/UX Notes

- All text is displayed in Hebrew (RTL layout)
- Task checklist should be clear and easy to interact with on mobile
- Save draft button always visible and accessible
- Submit button prominent but separate from save draft
- Visual progress indicator showing how many tasks are completed
- Auto-save could be implemented as a future enhancement
- Confirmation dialog before final submission

---

## Technical Notes

- Route: `/shifts/[id]/report`
- API endpoints: POST/PUT `/api/shifts/[id]/report`
- Draft saves use upsert logic (create or update)
- Submission triggers shift state transition to "closed"
- Task list is generated from the associated task template at report creation time
- Report data is immutable after submission
- Consider optimistic UI updates for save operations

---

## Acceptance Criteria

- [ ] Bartender can access the report filling interface for a running shift
- [ ] Task checklist is loaded from the associated task template
- [ ] Bartender can check off completed tasks
- [ ] Bartender can add notes to individual tasks
- [ ] Bartender can add general notes/comments
- [ ] Bartender can save a draft and continue later
- [ ] Saved draft preserves all progress
- [ ] Bartender can submit the completed report
- [ ] Submission validates that all required tasks are completed
- [ ] Submitted report transitions the shift to "closed" status
- [ ] Submitted report is read-only and cannot be edited
- [ ] Appropriate error messages are shown for failures

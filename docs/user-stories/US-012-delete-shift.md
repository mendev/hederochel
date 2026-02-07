# US-012: Delete Shift

## User Story

**As a** manager
**I want to** delete a shift from the system
**So that** I can remove shifts that are no longer needed or were created in error

---

## Actors

- **Primary Actor:** Manager
- **Secondary Actor:** System (Supabase backend)

---

## Preconditions

1. Manager is logged in with a manager role
2. The shift exists in the system
3. The shift is in "open" or "full" status (not running or closed)

---

## Main Flow

1. Manager navigates to the shifts calendar view
2. Manager selects the shift to delete
3. Manager clicks the delete button on the shift
4. System displays a confirmation dialog asking the manager to confirm deletion
5. Manager confirms the deletion
6. System removes the shift and all associated bartender assignments
7. System displays a success message
8. Calendar view refreshes to reflect the change

---

## Alternative Flows

### AF-1: Shift Is Currently Running
- **At step 3:** If the shift status is "running"
- System disables the delete button or displays an error: "לא ניתן למחוק משמרת פעילה" (Cannot delete a running shift)
- Manager cannot proceed with deletion

### AF-2: Shift Is Closed
- **At step 3:** If the shift status is "closed"
- System disables the delete button or displays an error: "לא ניתן למחוק משמרת סגורה" (Cannot delete a closed shift)
- Manager cannot proceed with deletion

### AF-3: Manager Cancels Deletion
- **At step 5:** Manager clicks cancel on the confirmation dialog
- System closes the dialog and no changes are made

---

## Postconditions

### Success
- The shift record is removed from the database
- All bartender assignments for that shift are removed
- The calendar view no longer displays the deleted shift

### Failure
- The shift remains unchanged in the system
- An error message is displayed to the manager

---

## Data Requirements

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| Shift ID | uuid | Yes | Must reference an existing shift |
| Shift Status | string | Yes | Must be "open" or "full" to allow deletion |

---

## UI/UX Notes

- All text is displayed in Hebrew (RTL layout)
- Confirmation dialog should clearly warn the manager about the irreversible action
- Delete button should be visually distinct (e.g., red) to indicate a destructive action
- Delete button is hidden or disabled for running and closed shifts

---

## Technical Notes

- API endpoint: DELETE `/api/shifts/[id]`
- Cascading delete removes associated bartender assignments
- Authorization check ensures only managers can delete shifts
- Status validation is performed server-side before deletion

---

## Acceptance Criteria

- [x] ~~Manager can delete a shift from the calendar view~~
- [x] ~~A confirmation dialog appears before deletion~~
- [x] ~~Running shifts cannot be deleted~~
- [x] ~~Closed shifts cannot be deleted~~
- [x] ~~Canceling the confirmation dialog does not delete the shift~~
- [x] ~~Associated bartender assignments are removed upon deletion~~
- [x] ~~Calendar view refreshes after successful deletion~~
- [x] ~~Success message is displayed after deletion~~

# US-015: Delete User

## User Story

**As a** manager
**I want to** delete a user from the system
**So that** I can permanently remove users who are no longer part of the team

---

## Actors

- **Primary Actor:** Manager
- **Secondary Actor:** System (Supabase Auth + backend)

---

## Preconditions

1. Manager is logged in with a manager role
2. The target user exists in the system
3. The target user is not a manager (managers cannot delete other managers)

---

## Main Flow

1. Manager navigates to the user management page
2. Manager locates the user to delete
3. Manager clicks the delete button for the user
4. System displays a confirmation dialog with the user's name and a warning about irreversibility
5. Manager confirms the deletion
6. System removes the user from all future shift assignments
7. System deletes the user profile from the database
8. System deletes the user's authentication account
9. System displays a success message
10. User list refreshes to reflect the removal

---

## Alternative Flows

### AF-1: Manager Cancels Deletion
- **At step 5:** Manager clicks cancel on the confirmation dialog
- System closes the dialog with no changes made

### AF-2: User Has Future Shifts
- **At step 6:** System detects the user is assigned to future shifts
- System removes the user from those shifts before deletion
- Confirmation dialog warns: "למשתמש זה X משמרות עתידיות שיוסרו" (This user has X future shifts that will be removed)

### AF-3: User Has Historical Data
- System preserves shift history and report data for closed shifts
- Deleted user's name is retained in historical records as a display string
- No referential integrity issues with past records

---

## Postconditions

### Success
- User's authentication account is deleted from Supabase Auth
- User's profile is removed from the `profiles` table
- User is removed from all future shift assignments
- Historical records (closed shifts, reports) retain the user's name for reference
- User can no longer log in

### Failure
- User remains in the system unchanged
- Error message is displayed to the manager
- Partial deletions are rolled back

---

## Data Requirements

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| User ID | uuid | Yes | Must reference an existing user |
| User Role | string | Yes | Must not be "manager" |
| Future Shifts Count | number | No | Calculated for confirmation dialog |

---

## UI/UX Notes

- All text is displayed in Hebrew (RTL layout)
- Delete button should be visually distinct (red) to indicate destructive action
- Confirmation dialog must be explicit about irreversibility
- Dialog should show the user's full name and number of affected future shifts
- Consider requiring the manager to type the user's name to confirm deletion

---

## Technical Notes

- API endpoint: DELETE `/api/users/[id]`
- Transaction-based deletion: remove assignments, profile, then auth user
- If any step fails, roll back all changes
- Use Supabase Admin API to delete auth user (service role key required)
- Historical references to the user should use a denormalized name field, not a foreign key

---

## Acceptance Criteria

- [ ] Manager can delete a user from the user management page
- [ ] Confirmation dialog appears before deletion
- [ ] Dialog warns about the number of future shifts affected
- [ ] User is removed from all future shift assignments
- [ ] User's authentication account is deleted
- [ ] User's profile is removed from the database
- [ ] Historical records retain the user's name
- [ ] Managers cannot delete other managers
- [ ] Deleted user can no longer log in
- [ ] Partial failures are rolled back

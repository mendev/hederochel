# US-014: Suspend and Unsuspend User

## User Story

**As a** manager
**I want to** suspend or unsuspend a user account
**So that** I can temporarily restrict access for users who should not be active in the system without permanently deleting them

---

## Actors

- **Primary Actor:** Manager
- **Secondary Actor:** System (Supabase Auth + backend)
- **Tertiary Actor:** Suspended User

---

## Preconditions

1. Manager is logged in with a manager role
2. The target user exists in the system
3. The target user is not a manager (managers cannot suspend other managers)

---

## Main Flow

1. Manager navigates to the user management page
2. Manager locates the user to suspend/unsuspend
3. Manager clicks the suspend/unsuspend toggle for the user
4. System displays a confirmation dialog explaining the consequences
5. Manager confirms the action
6. System updates the user's suspended status
7. If suspending: system removes the user from all future shift assignments
8. System displays a success message
9. User list refreshes to reflect the updated status

---

## Alternative Flows

### AF-1: Suspended User Attempts Login
- Suspended user navigates to the login page
- User enters valid credentials
- System rejects the login and displays: "החשבון שלך מושעה. פנה למנהל" (Your account is suspended. Contact a manager)

### AF-2: Manager Cancels Action
- **At step 5:** Manager clicks cancel on the confirmation dialog
- System closes the dialog with no changes made

### AF-3: User Has Future Shifts When Suspended
- **At step 7:** System detects the user is assigned to future shifts
- System automatically removes the user from those shifts
- System notifies the manager of affected shifts: "המשתמש הוסר מ-X משמרות עתידיות" (User removed from X future shifts)

### AF-4: Unsuspending a User
- **At step 3:** Manager clicks unsuspend for a currently suspended user
- System re-enables the user's account
- User can log in again (but is not automatically reassigned to any shifts)

---

## Postconditions

### Success
- User's suspended status is updated in the database
- If suspended: user cannot log in and is removed from future shifts
- If unsuspended: user can log in again

### Failure
- User's status remains unchanged
- Error message is displayed to the manager

---

## Data Requirements

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| User ID | uuid | Yes | Must reference an existing user |
| Suspended | boolean | Yes | true = suspended, false = active |
| Suspended At | timestamp | No | Set when user is suspended |
| Suspended By | uuid | No | Manager who performed the action |

---

## UI/UX Notes

- All text is displayed in Hebrew (RTL layout)
- Suspended users should be visually distinct in the user list (e.g., grayed out, badge)
- Confirmation dialog should list consequences (removal from future shifts)
- Toggle or button should clearly indicate current state and available action

---

## Technical Notes

- Suspension flag stored in the `profiles` table
- Login check must verify suspension status after authentication
- Batch operation needed to remove user from all future shift assignments
- Consider using Supabase Auth `ban` functionality or a custom `suspended` column
- Middleware or API-level check to block suspended users from all endpoints

---

## Acceptance Criteria

- [ ] Manager can suspend an active user
- [ ] Manager can unsuspend a suspended user
- [ ] Confirmation dialog appears before suspend/unsuspend action
- [ ] Suspended user cannot log in and sees an appropriate error message
- [ ] Suspending a user removes them from all future shift assignments
- [ ] Manager is informed of the number of affected future shifts
- [ ] Suspended users are visually distinct in the user list
- [ ] Unsuspended user can log in again immediately
- [ ] Managers cannot suspend other managers

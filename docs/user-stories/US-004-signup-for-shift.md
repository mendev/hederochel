# US-004: Sign Up for a Shift

## User Story

**As a** bartender
**I want to** sign up for an available open shift
**So that** I can be assigned to work that shift

---

## Actors

- **Primary Actor:** Bartender (authenticated)
- **Secondary Actor:** System (Supabase Database)

---

## Preconditions

1. User is logged in as a bartender
2. The shift exists and has status "open"
3. The shift has available spots (current signups < max bartenders)
4. The shift is in the future
5. The bartender is not already signed up for this shift

---

## Main Flow

1. Bartender views an available shift (via calendar - US-003)
2. Bartender clicks the "הרשמה למשמרת" (Sign up for shift) button
3. System validates:
   - Shift is not in the past
   - Bartender is not already signed up
   - Shift still has available spots
4. System creates an assignment record linking the bartender to the shift
5. System displays a Hebrew confirmation message (e.g., "נרשמת למשמרת בהצלחה")
6. System updates the available spots count
7. If the shift is now full, system updates shift status to "full"

---

## Alternative Flows

### AF-1: Shift is in the Past

1. Bartender attempts to sign up for a past shift
2. System rejects the request
3. System displays an error in Hebrew (e.g., "לא ניתן להירשם למשמרת שעברה")

### AF-2: Already Signed Up

1. Bartender attempts to sign up for a shift they are already assigned to
2. System rejects the request
3. System displays an error in Hebrew (e.g., "כבר נרשמת למשמרת זו")

### AF-3: Shift is Full

1. Bartender attempts to sign up but the shift reached max capacity
2. System rejects the request
3. System displays an error in Hebrew (e.g., "המשמרת מלאה")

### AF-4: Concurrent Signup Race Condition

1. Two bartenders attempt to sign up for the last spot simultaneously
2. System uses database-level constraints to ensure only one succeeds
3. The other bartender receives a "shift is full" error

---

## Postconditions

### Success
- A new assignment record is created in the database
- The shift's available spots count decreases by one
- If shift is now at capacity, status changes to "full"
- Bartender sees the shift in their "My Shifts" view (US-005)

### Failure
- No assignment record is created
- Shift state remains unchanged
- Error message is displayed in Hebrew

---

## Data Requirements

| Field        | Type   | Required | Validation Rules                          |
|--------------|--------|----------|-------------------------------------------|
| shift_id     | UUID   | Yes      | Must reference an existing open shift      |
| bartender_id | UUID   | Yes      | Must reference the authenticated bartender |
| signed_up_at | datetime | Yes    | Auto-generated timestamp                   |

---

## UI/UX Notes

- Signup button clearly visible on shift detail view
- Hebrew button text: "הרשמה למשמרת"
- Confirmation message displayed after successful signup
- Button disabled or hidden if shift is full or bartender already signed up
- RTL layout throughout

---

## Technical Notes

- API route: `POST /api/shifts/[id]` or dedicated signup endpoint
- Assignment stored in a join table (e.g., `shift_assignments`)
- Database constraint to prevent duplicate assignments (unique on shift_id + bartender_id)
- Check available spots server-side to prevent race conditions
- Supabase RLS policies ensure bartenders can only sign up for themselves

---

## Acceptance Criteria

- [x] ~~Bartender can sign up for an open shift with available spots~~
- [x] ~~System prevents signup for past shifts~~
- [x] ~~System prevents duplicate signups for the same shift~~
- [x] ~~System prevents signup when shift is full~~
- [x] ~~Successful signup shows a Hebrew confirmation message~~
- [x] ~~Available spots count updates after signup~~
- [x] ~~Shift status changes to "full" when max bartenders reached~~
- [x] ~~The shift appears in the bartender's "My Shifts" view after signup~~

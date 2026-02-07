# US-019: Default Landing Page

## User Story

**As a** user (manager or bartender)
**I want to** see a default landing page with system messages and announcements when I log in
**So that** I am immediately informed of important updates, upcoming shifts, and system-wide announcements

---

## Actors

- **Primary Actor:** User (Manager or Bartender)
- **Secondary Actor:** Manager (creates announcements)
- **Tertiary Actor:** System (displays relevant information)

---

## Preconditions

1. User is logged in
2. The landing page is configured as the default route after login

---

## Main Flow

1. User logs in or navigates to the home page
2. System displays the default landing page
3. Page shows the following sections:
   - System announcements/messages from managers
   - User's upcoming shifts (next 7 days)
   - Quick action buttons relevant to the user's role
4. Announcements are displayed in reverse chronological order (newest first)
5. User can dismiss or acknowledge announcements

---

## Alternative Flows

### AF-1: No Announcements
- **At step 3:** If no active announcements exist
- System displays a default welcome message or hides the announcements section

### AF-2: No Upcoming Shifts
- **At step 3:** If the user has no upcoming shifts
- System displays: "אין משמרות קרובות" (No upcoming shifts)

### AF-3: Manager View
- **At step 3:** Manager sees additional options:
  - Button to create a new announcement
  - Summary of today's active shifts
  - Quick links to management pages

---

## Postconditions

### Success
- User sees relevant, up-to-date information on the landing page
- Announcements are displayed correctly

### Failure
- Error message is displayed if data cannot be loaded
- Page shows a fallback state with basic navigation

---

## Data Requirements

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| Announcement ID | uuid | Yes (auto) | Auto-generated |
| Title | string | Yes | Non-empty |
| Content | string | Yes | Non-empty |
| Created By | uuid | Yes | Must reference a manager |
| Created At | timestamp | Yes (auto) | Auto-generated |
| Active | boolean | Yes | Determines visibility |
| Expires At | timestamp | No | Optional expiration date |

---

## UI/UX Notes

- All text is displayed in Hebrew (RTL layout)
- Landing page should feel informative but not overwhelming
- Announcements should be visually prominent
- Upcoming shifts should show date, time, and status at a glance
- Role-specific content should be clearly differentiated
- Mobile-responsive layout

---

## Technical Notes

- Default route: `/` or `/dashboard`
- Announcements stored in an `announcements` table in Supabase
- Upcoming shifts fetched with a date filter (next 7 days)
- Role-based conditional rendering for manager vs. bartender views
- Consider real-time subscription for live announcement updates

---

## Acceptance Criteria

- [ ] Landing page is displayed after login
- [ ] System announcements are shown in reverse chronological order
- [ ] User's upcoming shifts for the next 7 days are displayed
- [ ] Manager can create new announcements from the landing page
- [ ] Expired announcements are automatically hidden
- [ ] Page displays correctly for both manager and bartender roles
- [ ] Empty states are handled for no announcements and no shifts
- [ ] Page is responsive and works on mobile devices

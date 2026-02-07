# US-002: User Login

## User Story

**As a** registered user (bartender or manager)
**I want to** log in to the system with my email and password
**So that** I can access the shift management system according to my role

---

## Actors

- **Primary Actor:** Registered User (bartender or manager)
- **Secondary Actor:** System (Supabase Auth)

---

## Preconditions

1. The user has a registered account in the system (via signup - US-001)
2. The user's account is not suspended
3. The user has a valid email and password

---

## Main Flow

1. User navigates to the login page
2. System displays the login form with email and password fields (Hebrew UI - "התחבר")
3. User enters their email address
4. User enters their password
5. User clicks the "התחבר" (Login) button
6. System validates the credentials against Supabase Auth
7. System determines the user's role (bartender or manager)
8. System redirects the user to the appropriate dashboard:
   - Bartender role -> Bartender dashboard
   - Manager role -> Manager dashboard
9. System displays a success indication

---

## Alternative Flows

### AF-1: Invalid Credentials

1. User enters incorrect email or password
2. System displays an error message in Hebrew (e.g., "אימייל או סיסמה שגויים")
3. User remains on the login page and can retry

### AF-2: Suspended Account

1. User enters valid credentials but account is suspended
2. System displays a message indicating the account is suspended (e.g., "החשבון שלך הושעה, פנה למנהל")
3. User cannot proceed

### AF-3: Empty Fields

1. User attempts to submit the form with empty fields
2. System displays validation errors in Hebrew for the missing fields
3. User remains on the login page

---

## Postconditions

### Success
- User is authenticated and has an active session
- User is redirected to the correct dashboard based on their role
- Session token is stored (Supabase manages this automatically)

### Failure
- User remains on the login page
- No session is created
- Error message is displayed in Hebrew

---

## Data Requirements

| Field    | Type   | Required | Validation Rules                  |
|----------|--------|----------|-----------------------------------|
| email    | string | Yes      | Valid email format                 |
| password | string | Yes      | Minimum 6 characters              |

---

## UI/UX Notes

- Page is RTL (right-to-left) as the system is in Hebrew
- Login button text: "התחבר"
- Email field placeholder: "אימייל"
- Password field placeholder: "סיסמה"
- Link to signup page for new users
- Error messages displayed in Hebrew
- Loading spinner during authentication

---

## Technical Notes

- Authentication handled via Supabase Auth (`signInWithPassword`)
- Role is stored in the user profile / Supabase metadata
- After login, Next.js middleware or client-side logic redirects based on role
- Session persisted via Supabase client-side SDK

---

## Acceptance Criteria

- [x] ~~User can enter email and password on the login form~~
- [x] ~~Login button triggers authentication via Supabase Auth~~
- [x] ~~Invalid credentials show an error message in Hebrew~~
- [x] ~~Successful login redirects bartenders to the bartender dashboard~~
- [x] ~~Successful login redirects managers to the manager dashboard~~
- [x] ~~Suspended accounts are prevented from logging in~~
- [x] ~~Form validates that required fields are not empty~~
- [x] ~~UI is displayed in Hebrew (RTL layout)~~

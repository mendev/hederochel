# US-001: New User Signup

## User Story

**As a** new user
**I want to** sign up to the system with my email and personal details
**So that** I can access the shift management system and manage my work schedule

---

## Actors

- **Primary Actor:** New User (unregistered)
- **Secondary Actor:** System (Supabase Auth)

---

## Preconditions

1. User has access to the application URL
2. User has a valid email address
3. User is not already registered in the system

---

## Main Flow

1. User navigates to the login page
2. User clicks the "הירשם" (Sign Up) button
3. System displays the signup dialog form
4. User enters the following information:
   - Email address
   - Full name
   - Password
   - Password confirmation
5. User clicks the "הירשם" (Sign Up) submit button
6. System validates the input data
7. System creates the user account in the authentication service
8. System creates a user profile with default role "bartender"
9. System displays a success message
10. User is redirected to the login page to authenticate

---

## Alternative Flows

### AF-1: Email Already Exists
- **At step 6:** If the email is already registered
- System displays error message: "משתמש עם אימייל זה כבר קיים" (User with this email already exists)
- User remains on the signup form to correct the email

### AF-2: Passwords Do Not Match
- **At step 6:** If password and confirmation do not match
- System displays error message: "הסיסמאות אינן תואמות" (Passwords do not match)
- User remains on the signup form to correct the password

### AF-3: Password Too Short
- **At step 6:** If password is less than 6 characters
- System displays error message: "הסיסמה חייבת להכיל לפחות 6 תווים" (Password must contain at least 6 characters)
- User remains on the signup form to enter a valid password

### AF-4: Missing Required Fields
- **At step 6:** If any required field is empty
- System displays validation error
- User remains on the signup form to complete all fields

---

## Postconditions

### Success
- User account is created in Supabase Auth
- User profile is created in the `profiles` table with:
  - `id`: User's unique identifier
  - `full_name`: User's full name
  - `role`: "bartender" (default)
- User can now log in with their credentials

### Failure
- No user account is created
- No profile record is created
- Error message is displayed to the user

---

## Data Requirements

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| Email | string | Yes | Valid email format, unique in system |
| Full Name | string | Yes | Non-empty |
| Password | string | Yes | Minimum 6 characters |
| Confirm Password | string | Yes | Must match Password field |

---

## UI/UX Notes

- All text is displayed in Hebrew (RTL layout)
- Form uses `dir="rtl"` for proper text alignment
- Success message displays for 2 seconds before dialog closes
- Form fields use standard input validation styling

---

## Technical Notes

- Authentication handled by Supabase Auth service
- Email is auto-confirmed (no email verification step)
- Server uses admin client (service role) to create users
- If profile creation fails, the auth user is rolled back (deleted)

---

## Acceptance Criteria

- [ ] User can access the signup form from the login page
- [ ] All required fields are validated before submission
- [ ] Duplicate email addresses are rejected with a clear error message
- [ ] Password validation enforces minimum 6 characters
- [ ] Password confirmation must match the password
- [ ] Successful signup creates both auth user and profile record
- [ ] New users are assigned the "bartender" role by default
- [ ] Success message is displayed upon successful registration
- [ ] User can log in immediately after signup

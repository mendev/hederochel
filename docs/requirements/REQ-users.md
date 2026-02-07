# Requirements: User Management

| ID | Description | Priority | Status | Related Stories |
|----|-------------|----------|--------|-----------------|
| REQ-USR-001 | Users can sign up for a new bartender account with name, email, and password | High | todo | US-USR-001 |
| REQ-USR-002 | Users can log in with email and password via Supabase Auth | High | done | US-USR-002 |
| REQ-USR-003 | System supports two roles: bartender and manager | High | done | US-USR-003 |
| REQ-USR-004 | New accounts default to the bartender role | Medium | done | US-USR-001 |
| REQ-USR-005 | Managers can view a list of all registered users | High | done | US-USR-004 |
| REQ-USR-006 | Managers can suspend a user, preventing them from logging in or signing up for shifts | High | todo | US-USR-005 |
| REQ-USR-007 | Managers can unsuspend a previously suspended user | High | todo | US-USR-005 |
| REQ-USR-008 | Managers can delete a user account entirely | Medium | todo | US-USR-006 |
| REQ-USR-009 | Managers can change a user's password on their behalf | Medium | done | US-USR-007 |
| REQ-USR-010 | Managers can change a user's role between bartender and manager | Medium | done | US-USR-008 |
| REQ-USR-011 | Bartenders cannot access manager-only pages or API routes | High | done | US-USR-009 |
| REQ-USR-012 | Users can view and edit their own profile information | Low | done | US-USR-010 |

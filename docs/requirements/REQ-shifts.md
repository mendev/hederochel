# Requirements: Shift Management

| ID | Description | Priority | Status | Related Stories |
|----|-------------|----------|--------|-----------------|
| REQ-SHF-001 | Managers can create a new shift with date, time, location, and capacity | High | done | US-SHF-001 |
| REQ-SHF-002 | Managers can edit an existing shift's details | High | done | US-SHF-002 |
| REQ-SHF-003 | Managers can delete a shift | High | done | US-SHF-003 |
| REQ-SHF-004 | Managers can view all shifts across all dates | High | done | US-SHF-004 |
| REQ-SHF-005 | Bartenders can view available open shifts they can sign up for | High | done | US-SHF-005 |
| REQ-SHF-006 | Bartenders can sign up for an open shift that has remaining capacity | High | done | US-SHF-006 |
| REQ-SHF-007 | Bartenders can view their own upcoming shifts | High | done | US-SHF-007 |
| REQ-SHF-008 | Bartenders can cancel their signup for a future shift | High | done | US-SHF-008 |
| REQ-SHF-009 | Bartenders can view their past completed shifts | Medium | todo | US-SHF-009 |
| REQ-SHF-010 | Shift transitions from open to full when all capacity slots are taken | High | done | US-SHF-010 |
| REQ-SHF-011 | Shift transitions from full back to open if a bartender cancels | High | done | US-SHF-010 |
| REQ-SHF-012 | Shifts in open/full state are presented as running once start_at (timestamptz) is reached — running state is derived at read time, never written to the DB state column | High | done | US-SHF-010 |
| REQ-SHF-013 | Shift transitions from running to closed only when a report is submitted — end time passing does not auto-close a shift | High | todo | US-SHF-010 |
| REQ-SHF-014 | Bartenders cannot sign up for a shift that is full, running, or closed | Medium | todo | US-SHF-006 |
| REQ-SHF-015 | Suspended users cannot sign up for any shift | Medium | todo | US-USR-005, US-SHF-006 |
| REQ-SHF-016 | Test all shifts flows automatically | High | todo | US-USR-001 |
| REQ-SHF-017 | Managers can remove a registered bartender from a shift's bartender list (v.1: removal only — manual assignment by manager is v.2) | High | todo | US-011 |
| REQ-SHF-018 | Bartenders can view shift details from "המשמרות שלי" in a detail popup | High | todo | US-005, US-020 |

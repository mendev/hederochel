**. Core entities \- data & CRUD operations**

* User: create, read, update, delete, suspend/unsuspend, promote to manager  
* Shift: create, read, update, delete, list by status (open/full/running/closed)  
* Report: create, read, update, mark complete  
* Task template: create, read, update, delete (what tasks go in reports)  
* Task completion: mark task as done, record output if needed

**2\. User workflows \- bartender perspective**

- [ ] Sign up for account  
- [x] ~~Log in~~  
- [x] ~~View available open shifts~~  
- [x] ~~Sign up for a shift~~  
- [x] ~~View my upcoming shifts~~  
- [x] ~~Cancel my signup for a shift~~  
- [ ] Access report for running shift I'm working  
- [ ] Complete tasks in active report  
- [ ] View shifts I've worked in the past

**3\. User workflows \- manager perspective**

- [ ] All bartender workflows above  
- [x] ~~Create new shift~~  
- [x] ~~Edit existing shift~~  
- [x] ~~Delete shift~~  
- [x] ~~View all shifts (any status)~~  
- [ ] Suspend/unsuspend user  
- [ ] Delete user  
- [ ] Add task to report template  
- [ ] Remove task from report template  
- [ ] Modify task in report template  
- [ ] View completed reports  
- [ ] View report history for analysis

**4\. Business logic & state transitions**

- [ ] Shift becomes "full" when max bartenders reached  
- [ ] Shift becomes "running" at scheduled time  
- [ ] Shift becomes "closed" when report completed  
- [ ] Suspended user cannot log in  
- [ ] Only managers can access admin functions  
- [ ] Only bartenders on a shift can access its report  
- [ ] Report can only be created for "running" shift  
- [ ] Report cannot be edited after shift "closed" (decide if you want this)

**5\. Edge cases & validations**

- [ ] Can't sign up for shift in the past  
- [ ] Can't sign up for same shift twice  
- [ ] Can't sign up if already signed up for overlapping shift  
- [ ] Can't delete user who has future shifts (or decide what happens)  
- [ ] Can't delete shift that's running or closed (or decide what happens)  
- [ ] What happens when suspended user has future shifts  
- [ ] Handle empty states (no shifts yet, no users yet, etc.)

**6\. UI pages/views needed**

- [ ] Default page with messages  
- [x] ~~Login/signup page~~  
- [x] ~~Bartender dashboard (my shifts, available shifts)~~  
- [x] ~~Manager dashboard (shift management, user management)~~  
- [ ] Shift detail page  
- [ ] Report filling interface  
- [x] ~~User profile/settings~~  
- [ ] Task template management page


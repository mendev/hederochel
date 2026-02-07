# US-016: Manage Task Templates

## User Story

**As a** manager
**I want to** create, read, update, and delete task templates
**So that** I can define the standard tasks that appear in shift reports for bartenders to complete

---

## Actors

- **Primary Actor:** Manager
- **Secondary Actor:** System (Supabase backend)

---

## Preconditions

1. Manager is logged in with a manager role
2. The task templates table exists in the database

---

## Main Flow

1. Manager navigates to the task template management page
2. System displays a list of existing task templates
3. Manager performs one of the CRUD operations:

### Create
4a. Manager clicks "הוסף תבנית" (Add Template)
5a. System displays a form for creating a new template
6a. Manager enters template name and list of tasks
7a. Manager saves the template
8a. System validates and stores the new template

### Read
4b. Manager views the list of templates with their tasks

### Update
4c. Manager clicks edit on an existing template
5c. System displays the template form pre-filled with current data
6c. Manager modifies the template name or tasks (add, remove, reorder)
7c. Manager saves the changes
8c. System validates and updates the template

### Delete
4d. Manager clicks delete on a template
5d. System displays a confirmation dialog
6d. Manager confirms deletion
7d. System removes the template

---

## Alternative Flows

### AF-1: Duplicate Template Name
- **At step 8a/8c:** If the template name already exists
- System displays error: "שם תבנית זה כבר קיים" (This template name already exists)
- Manager corrects the name

### AF-2: Template In Use
- **At step 7d:** If the template is currently associated with active or future shifts
- System warns: "תבנית זו בשימוש ב-X משמרות. מחיקה תשפיע על דוחות עתידיים" (This template is in use in X shifts. Deletion will affect future reports)
- Manager can proceed or cancel

### AF-3: Empty Task List
- **At step 8a/8c:** If no tasks are defined in the template
- System displays error: "יש להוסיף לפחות משימה אחת" (At least one task must be added)

---

## Postconditions

### Success
- Template is created/updated/deleted in the database
- Future shift reports will use the updated templates
- Existing completed reports are not affected by template changes

### Failure
- No changes are made to the database
- Error message is displayed to the manager

---

## Data Requirements

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| Template ID | uuid | Yes (auto) | Auto-generated |
| Template Name | string | Yes | Non-empty, unique |
| Tasks | array | Yes | At least one task |
| Task Name | string | Yes | Non-empty |
| Task Description | string | No | Optional details |
| Task Order | number | Yes | Determines display order |
| Created At | timestamp | Yes (auto) | Auto-generated |
| Updated At | timestamp | Yes (auto) | Auto-updated |

---

## UI/UX Notes

- All text is displayed in Hebrew (RTL layout)
- Template list should show template name and number of tasks
- Task editing should support drag-and-drop reordering
- Inline editing for quick task name changes
- Clear visual separation between templates

---

## Technical Notes

- API endpoints: CRUD on `/api/task-templates` and `/api/task-templates/[id]`
- Templates are stored in a `task_templates` table
- Tasks are stored in a `template_tasks` table with a foreign key to the template
- Deleting a template should soft-delete or cascade based on business rules
- Consider versioning templates so existing reports reference the template version used at creation time

---

## Acceptance Criteria

- [ ] Manager can view a list of all task templates
- [ ] Manager can create a new task template with a name and tasks
- [ ] Manager can edit an existing template's name and tasks
- [ ] Manager can delete a template with confirmation
- [ ] Duplicate template names are rejected
- [ ] Templates must have at least one task
- [ ] Tasks can be reordered within a template
- [ ] Deleting a template in use shows a warning
- [ ] Existing completed reports are not affected by template changes

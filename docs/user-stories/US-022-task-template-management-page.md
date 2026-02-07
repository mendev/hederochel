# US-022: Task Template Management Page

## User Story

**As a** manager
**I want to** have a dedicated UI page for managing task templates and their tasks
**So that** I can easily create, view, edit, and delete templates that define the structure of shift reports

---

## Actors

- **Primary Actor:** Manager
- **Secondary Actor:** System (Supabase backend)

---

## Preconditions

1. Manager is logged in with a manager role
2. The task templates and template tasks tables exist in the database

---

## Main Flow

1. Manager navigates to the task template management page via the navigation menu
2. System displays a list of all existing templates with summary info (name, task count)
3. Manager selects a template to view/edit its tasks
4. System displays the template details with a list of tasks
5. Manager can perform the following actions:
   - Create a new template
   - Rename an existing template
   - Add tasks to a template
   - Edit task names and descriptions
   - Reorder tasks via drag-and-drop
   - Remove tasks from a template
   - Delete an entire template

---

## Alternative Flows

### AF-1: Create New Template
- Manager clicks "תבנית חדשה" (New Template)
- System displays an inline form or dialog for the template name
- Manager enters the name and confirms
- System creates the template and opens it for task editing

### AF-2: Add Task to Template
- Manager clicks "הוסף משימה" (Add Task) within a template
- System adds a new empty task row
- Manager enters the task name and optional description
- System saves the task

### AF-3: Delete Template With Confirmation
- Manager clicks delete on a template
- System shows confirmation: "האם אתה בטוח שברצונך למחוק תבנית זו?" (Are you sure you want to delete this template?)
- If template is in use, additional warning is shown
- Manager confirms or cancels

### AF-4: Reorder Tasks
- Manager drags a task to a new position in the list
- System updates the task order and saves automatically

### AF-5: No Templates Exist
- **At step 2:** If no templates exist
- System displays: "אין תבניות משימות. צור תבנית חדשה" (No task templates. Create a new template)

---

## Postconditions

### Success
- Templates and tasks are persisted in the database
- Changes are reflected immediately in the UI
- Future shift reports will use the updated templates

### Failure
- Changes are not saved
- Error message is displayed to the manager
- Previous state is preserved

---

## Data Requirements

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| Template ID | uuid | Yes (auto) | Auto-generated |
| Template Name | string | Yes | Non-empty, unique |
| Tasks | array | Yes | At least one task per template |
| Task ID | uuid | Yes (auto) | Auto-generated |
| Task Name | string | Yes | Non-empty |
| Task Description | string | No | Optional details |
| Task Order | number | Yes | Determines display order, auto-managed |
| Created At | timestamp | Yes (auto) | Auto-generated |
| Updated At | timestamp | Yes (auto) | Auto-updated |

---

## UI/UX Notes

- All text is displayed in Hebrew (RTL layout)
- Master-detail layout: template list on one side, task details on the other
- Drag-and-drop for task reordering with visual handles
- Inline editing for quick changes to task names
- Add/remove buttons clearly positioned
- Responsive layout for different screen sizes
- Loading states for save operations
- Undo capability for accidental deletions (nice-to-have)

---

## Technical Notes

- Route: `/templates` or `/admin/templates`
- API endpoints: CRUD on `/api/task-templates` and `/api/task-templates/[id]/tasks`
- Use optimistic UI updates for smooth editing experience
- Drag-and-drop library (e.g., dnd-kit or react-beautiful-dnd) for task reordering
- Debounced auto-save for inline edits
- Role-based access: only managers can access this page
- Navigation guard redirects non-managers away from the page

---

## Acceptance Criteria

- [ ] Manager can access the template management page from navigation
- [ ] Page displays a list of all templates with task counts
- [ ] Manager can create a new template with a name
- [ ] Manager can rename an existing template
- [ ] Manager can add tasks to a template
- [ ] Manager can edit task names and descriptions inline
- [ ] Manager can reorder tasks via drag-and-drop
- [ ] Manager can remove tasks from a template
- [ ] Manager can delete a template with confirmation
- [ ] Templates in use show a warning before deletion
- [ ] Empty state is shown when no templates exist
- [ ] Only managers can access this page

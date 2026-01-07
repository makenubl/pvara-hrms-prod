# WhatsApp Chatbot Test Guide

## Test Setup Summary

### Admin User (YOUR ACCOUNT)
- **Name:** Salman Yousafi
- **Email:** salman.yousafi@pvara.gov.pk
- **Role:** Admin
- **Phone/WhatsApp:** +923345224359
- **User ID:** 6941a96204ad309188334043

### Test Employee User
- **Name:** Sadaqat Ali
- **Email:** sadaqat.ali@pvara.gov.pk
- **Role:** Employee
- **WhatsApp:** +923001234567 (test number)
- **User ID:** 6941a96404ad309188334055

---

## Twilio Configuration

### Webhook URL Setup
Configure this URL in your Twilio Console under WhatsApp Sandbox/Number Settings:

```
POST: https://your-backend-url.com/api/whatsapp/webhook
```

For local testing with ngrok:
```bash
ngrok http 5000
# Then use: https://xxx.ngrok.io/api/whatsapp/webhook
```

### Twilio WhatsApp Sandbox
1. Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message
2. Send "join <sandbox-keyword>" to +14155238886 (Twilio sandbox)
3. Or configure your production number: +14583092310

---

## Test Messages

### 1. CREATE TASK (Self-Assigned)

**Message Format:**
```
create task <title> by <deadline>
```

**Test Messages:**
```
create task Review budget proposal by tomorrow
```
```
create task Submit quarterly report by next Friday
```
```
create task Prepare meeting agenda by 5pm today
```
```
create task Complete performance reviews by Dec 31
```
```
create task Update project documentation by end of week
```

**Expected Response:**
```
✅ Task Created Successfully!

📋 Title: Review budget proposal
📅 Deadline: [formatted date]
👤 Assigned to: You
📊 Status: pending

Reply with task number to get updates or use "update task [number] [status]" to change status.
```

---

### 2. ASSIGN TASK (Admin Only)

**Message Format:**
```
assign task <title> to <employee name or email> by <deadline>
```

**Test Messages:**
```
assign task Review contract to Sadaqat Ali by tomorrow
```
```
assign task Prepare presentation to sadaqat.ali@pvara.gov.pk by Friday
```
```
assign task Update employee records to Qamar by next week
```
```
assign task Complete audit report to Sadaqat by Dec 30
```

**Expected Response:**
```
✅ Task Assigned Successfully!

📋 Title: Review contract
📅 Deadline: [formatted date]
👤 Assigned to: Sadaqat Ali
📊 Status: pending

The assignee will receive a notification.
```

---

### 3. UPDATE TASK STATUS

**Message Format:**
```
update task <task number> <status>
```

**Valid Statuses:** pending, in-progress, completed, blocked, cancelled

**Test Messages:**
```
update task 1 in-progress
```
```
update task 2 completed
```
```
update task 3 blocked
```

**Expected Response:**
```
✅ Task Updated!

📋 Task: Review budget proposal
📊 Old Status: pending
📊 New Status: in-progress
```

---

### 4. UPDATE TASK PROGRESS

**Message Format:**
```
progress task <task number> <percentage>
```

**Test Messages:**
```
progress task 1 25%
```
```
progress task 1 50
```
```
progress task 2 75%
```
```
progress task 3 100%
```

**Expected Response:**
```
📊 Progress Updated!

📋 Task: Review budget proposal
📈 Progress: 50%
📊 Status: in-progress
```

---

### 5. VIEW ALL TASKS

**Message Format:**
```
list tasks
my tasks
show tasks
view tasks
```

**Expected Response:**
```
📋 Your Tasks (5 total)

1. Review budget proposal
   📊 Status: in-progress | 📅 Due: Dec 25, 2024

2. Submit quarterly report
   📊 Status: pending | 📅 Due: Dec 27, 2024

3. Prepare meeting agenda
   📊 Status: completed | 📅 Due: Dec 20, 2024

Reply with task number for details.
```

---

### 6. VIEW SINGLE TASK

**Message Format:**
```
task <number>
view task <number>
show task <number>
```

**Test Messages:**
```
task 1
view task 2
show task 3
```

**Expected Response:**
```
📋 Task Details

Title: Review budget proposal
Description: [if any]
📊 Status: in-progress
📈 Progress: 50%
📅 Deadline: Dec 25, 2024
👤 Assigned by: Salman Yousafi
🏷️ Priority: high
📝 Notes: [if any]

Commands:
• update task 1 completed
• progress task 1 75%
```

---

### 7. VOICE NOTE TASKS

Send a voice note with spoken commands:

**Test Voice Messages:**
- "Create task review budget proposal by tomorrow"
- "Update task 1 to completed"
- "Assign task prepare presentation to Sadaqat by Friday"

**Expected Behavior:**
1. Bot transcribes voice note using OpenAI Whisper
2. Parses the transcribed text
3. Executes the command
4. Responds with confirmation

---

### 8. HELP COMMAND

**Message:**
```
help
```

**Expected Response:**
```
🤖 PVARA HRMS WhatsApp Bot

Available Commands:

📝 CREATE TASK
   create task [title] by [deadline]
   Example: create task Review report by tomorrow

👥 ASSIGN TASK (Admins)
   assign task [title] to [person] by [deadline]
   Example: assign task Update docs to John by Friday

📊 UPDATE STATUS
   update task [number] [status]
   Status: pending, in-progress, completed, blocked
   Example: update task 1 completed

📈 UPDATE PROGRESS
   progress task [number] [percentage]
   Example: progress task 1 50%

📋 VIEW TASKS
   list tasks - Show all your tasks
   task [number] - View specific task

🎤 VOICE NOTES
   Send a voice note with any command above

Need help? Reply HELP anytime.
```

---

## Notification Types

### Task Assignment Notification
When someone is assigned a task, they receive:
```
📋 New Task Assigned!

You have been assigned a new task by Salman Yousafi:

Title: Review contract
Description: [task description]
📅 Deadline: Dec 25, 2024
🏷️ Priority: high

Reply "task 1" for details or "update task 1 in-progress" to start working.
```

### Task Update Notification
When a task is updated:
```
📊 Task Updated

Your task "Review contract" has been updated:

📊 Status: in-progress → completed
📈 Progress: 100%
Updated by: Salman Yousafi
```

### Deadline Reminder Notification
Automatic reminders before deadline:
```
⏰ Task Reminder

Your task "Review contract" is due in 1 hour!

📊 Current Status: in-progress
📈 Progress: 75%

Reply "update task 1 completed" when done.
```

### Overdue Notification
```
🚨 Task Overdue

Your task "Review contract" is now overdue!

📅 Was due: Dec 25, 2024
📊 Status: in-progress
📈 Progress: 75%

Please update the status or contact your manager.
```

---

## Testing Checklist

### Basic Functionality
- [ ] Send "help" and receive help message
- [ ] Create a task for yourself
- [ ] View list of tasks
- [ ] View single task details
- [ ] Update task status
- [ ] Update task progress

### Admin Features
- [ ] Assign task to employee
- [ ] Verify assignee receives notification

### Voice Notes
- [ ] Send voice note to create task
- [ ] Send voice note to update task

### Notifications
- [ ] Verify task assignment notification
- [ ] Verify task update notification
- [ ] Test deadline reminders (set task due in 30 mins)

---

## API Endpoints for Manual Testing

### Webhook Endpoint
```bash
# Test webhook with curl
curl -X POST http://localhost:5000/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+923345224359" \
  -d "Body=help" \
  -d "ProfileName=Salman Yousafi"
```

### Create Task via Webhook
```bash
curl -X POST http://localhost:5000/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+923345224359" \
  -d "Body=create task Test from curl by tomorrow" \
  -d "ProfileName=Salman Yousafi"
```

### Assign Task via Webhook
```bash
curl -X POST http://localhost:5000/api/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+923345224359" \
  -d "Body=assign task Review report to Sadaqat by friday" \
  -d "ProfileName=Salman Yousafi"
```

---

## Error Scenarios

### User Not Found
```
❌ Sorry, your phone number is not registered in our system.
Please contact your administrator to link your WhatsApp number.
```

### Permission Denied
```
❌ Sorry, only administrators can assign tasks to others.
You can create tasks for yourself using: create task [title] by [deadline]
```

### Task Not Found
```
❌ Task not found.
Use "list tasks" to see your available tasks.
```

### Invalid Command
```
🤔 I didn't understand that command.
Reply HELP to see available commands.
```

---

## Troubleshooting

### Backend Not Receiving Messages
1. Check ngrok is running and URL is configured in Twilio
2. Verify webhook URL ends with `/api/whatsapp/webhook`
3. Check backend logs for incoming requests

### User Not Found Error
1. Verify phone number format in database (with + and country code)
2. Run: `db.users.findOne({whatsappNumber: '+923345224359'})`

### Task Creation Fails
1. Check MongoDB connection
2. Verify Task model is properly imported
3. Check server logs for errors

### Voice Notes Not Working
1. Verify OpenAI API key in .env
2. Check if Twilio is forwarding media URL
3. Test transcription service separately

---

## Database Queries for Testing

```javascript
// Find user by WhatsApp number
db.users.findOne({whatsappNumber: '+923345224359'})

// Find all tasks for a user
db.tasks.find({assignee: ObjectId('6941a96204ad309188334043')})

// Find tasks created via WhatsApp
db.tasks.find({source: 'whatsapp'})

// Update user's WhatsApp preferences
db.users.updateOne(
  {email: 'salman.yousafi@pvara.gov.pk'},
  {$set: {whatsappPreferences: {enabled: true, taskAssigned: true, taskUpdates: true, reminders: true}}}
)
```

---

## Quick Reference Card

| Action | Command |
|--------|---------|
| Create Task | `create task [title] by [deadline]` |
| Assign Task | `assign task [title] to [person] by [deadline]` |
| Update Status | `update task [#] [status]` |
| Update Progress | `progress task [#] [%]` |
| List Tasks | `list tasks` |
| View Task | `task [#]` |
| Get Help | `help` |

**Status Options:** pending, in-progress, completed, blocked, cancelled

# WhatsApp Chatbot Test Guide

## � Webhook Configuration

**Twilio Webhook URL:** `https://9f0fc404d728.ngrok-free.app/api/whatsapp/webhook`

Configure this URL in your Twilio Console:
1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Under **Sandbox Settings**, set:
   - **WHEN A MESSAGE COMES IN**: `https://9f0fc404d728.ngrok-free.app/api/whatsapp/webhook`
   - Method: `POST`

---

## 📱 Your Phone Number Setup

Your WhatsApp number **+923345224359** needs to be associated with a user in the database.
**Important:** Each user must have a **unique** WhatsApp number.

### Option 1: Via MongoDB Compass or CLI
Run this MongoDB command to update an admin user:

```javascript
db.users.updateOne(
  { role: { $in: ['admin', 'chairman', 'manager'] } },
  {
    $set: {
      phone: '+923345224359',
      whatsappNumber: '+923345224359',
      whatsappPreferences: {
        enabled: true,
        taskAssigned: true,
        taskUpdates: true,
        reminders: true,
        reminderIntervals: [1440, 240, 60, 30]
      }
    }
  }
)
```

### Option 2: Via API (when server is running)
Update your profile via the HRMS web interface and add your phone number.

---

## 🧪 Test Messages to Send via WhatsApp

Once connected to the Twilio WhatsApp sandbox, send these messages:

### Basic Commands
| Message | Expected Response |
|---------|------------------|
| `hi` | Welcome message with instructions |
| `hello` | Welcome message |
| `help` | List of all available commands |
| `status` | Your task summary (total, pending, completed, etc.) |

### View Tasks
| Message | Expected Response |
|---------|------------------|
| `show my tasks` | List of your tasks |
| `my tasks` | List of your tasks |
| `pending tasks` | Only pending tasks |
| `deadlines` | Upcoming deadlines |
| `show TASK-2026-0001` | Details of specific task |

### Create Tasks (for yourself)
| Message | Expected Response |
|---------|------------------|
| `create task: Review budget report` | Task created confirmation |
| `new task: Prepare presentation, high priority, due tomorrow` | Task with priority & deadline |
| `task: Call vendor by Friday` | Task with deadline |

### Assign Tasks (admin/manager only)
| Message | Expected Response |
|---------|------------------|
| `assign task: Review code to Ahmad` | Task assigned to Ahmad |
| `create task for Ahmed: Prepare report` | Task assigned to Ahmed |

### Update Task Status
| Message | Expected Response |
|---------|------------------|
| `TASK-2026-0001 is completed` | Status updated to completed |
| `mark TASK-2026-0001 as in-progress` | Status updated |
| `complete TASK-2026-0001` | Status updated to completed |
| `start TASK-2026-0001` | Status updated to in-progress |

### Update Progress
| Message | Expected Response |
|---------|------------------|
| `TASK-2026-0001 progress 50%` | Progress updated to 50% |
| `TASK-2026-0001 75%` | Progress updated to 75% |

### Add Comments/Updates
| Message | Expected Response |
|---------|------------------|
| `TASK-2026-0001: Completed first draft` | Comment added |
| `update TASK-2026-0001: Waiting for feedback` | Comment added |

### Report Blockers
| Message | Expected Response |
|---------|------------------|
| `TASK-2026-0001 blocked: Waiting for approval` | Blocker reported, status changed |

### Voice Notes
Send a voice message like:
- "Update task TASK-2026-0001 progress to 60 percent"
- "Create a new task called review monthly report with high priority"

---

## 🔧 Twilio Setup

Set these in `backend/.env` (do not commit real values):
```
TWILIO_SID=your-twilio-account-sid
TWILIO_AUTH=your-twilio-auth-token
TWILIO_NUMBER=+14583092310
```

### For WhatsApp Sandbox Testing:
1. Go to [Twilio Console](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Note the sandbox join code
3. Send `join <sandbox-code>` to **+1 415 523 8886** on WhatsApp
4. Configure webhook URL in Twilio console:
  - **When a message comes in**: `https://<your-domain-or-ngrok>/api/whatsapp/webhook`
   - Method: POST

### For Local Testing with ngrok:
```bash
# In terminal 1: Start backend
cd backend && npm run dev

# In terminal 2: Start ngrok
ngrok http 5000

# Use the ngrok URL (e.g., https://abc123.ngrok.io/api/whatsapp/webhook)
```

---

## 📋 Sample Test Scenarios

### Scenario 1: Basic Interaction
1. Send: `hi`
2. Send: `help`
3. Send: `status`

### Scenario 2: View Tasks
1. Send: `show my tasks`
2. Send: `deadlines`
3. Send: `show TASK-2026-0001`

### Scenario 3: Create Task
1. Send: `create task: Test WhatsApp integration`
2. Check web app to verify task was created
3. Send: `show my tasks` to see the new task

### Scenario 4: Update Task
1. Send: `TASK-2026-0001 progress 30%`
2. Send: `TASK-2026-0001: Started working on this`
3. Send: `mark TASK-2026-0001 as in-progress`
4. Send: `TASK-2026-0001 is completed`

### Scenario 5: Admin Assigns Task
1. Send: `assign task: Review quarterly report to Ahmad`
2. Ahmad should receive notification (if WhatsApp configured)

### Scenario 6: Voice Note
1. Send a voice note saying: "Create task review monthly budget with high priority due tomorrow"
2. Bot should transcribe and create the task

---

## 🔔 Reminder Notifications

The system will automatically send reminders:
- **1 day before** deadline
- **4 hours before** deadline
- **1 hour before** deadline
- **30 minutes before** deadline

You can customize these in your whatsappPreferences.

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Phone Number Not Registered" | Add your phone to a user in DB |
| No response from bot | Check Twilio webhook is configured correctly |
| "Failed to process" | Check backend logs for errors |
| Voice note not working | Ensure OPENAI_API_KEY is set in .env |


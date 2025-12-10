# Quick Start Guide - Supervisor/Manager Performance System

## 🚀 Immediate Access

### For Managers/Supervisors:
**Login:** http://localhost:5173
- Email: `manager@pvara.com`
- Password: `manager123`
- Team: 2 employees (John Doe, Muhammad Usman Malik)

**Menu:** Click "Team Performance" in the left sidebar

### For Employees:
**Login:** http://localhost:5173
- Email: `employee@pvara.com`
- Password: `employee123`

**View Supervisor:** Go to "My Profile" → See supervisor info in left sidebar

## 📋 Manager Tasks

### 1. Create KPI Goal
1. Navigate to **Team Performance**
2. Stay on **KPI Goals** tab
3. Click **"Create Goal"** button
4. Fill in the form:
   - Select employee from dropdown
   - Enter goal title (e.g., "Complete 15 Projects")
   - Add description (optional)
   - Choose category (Productivity, Quality, etc.)
   - Set target value (e.g., 15)
   - Enter unit (e.g., "projects")
   - Set weightage percentage (1-100%)
   - Choose start and end dates
5. Click **"Create Goal"**
6. ✅ Goal is now assigned to employee

### 2. Create Performance Review
1. Navigate to **Team Performance**
2. Switch to **Performance Reviews** tab
3. Click **"Create Review"** button
4. Fill in the review:
   - Select employee (goals auto-load)
   - Set review period (start/end dates)
   - For each goal:
     - Enter actual value achieved
     - System auto-calculates achievement %
     - Add comments (optional)
   - Select overall rating (5 options)
   - Add strengths (can add multiple)
   - Add areas for improvement (can add multiple)
   - Write overall comments
   - Define action plan
5. Click **"Submit Review"**
6. ✅ Review is sent to employee

### 3. View Team Members
1. Navigate to **Team Performance**
2. Switch to **Team Members** tab
3. See all direct reports
4. Use search to find specific employees

## 👤 Employee Actions

### View Your Supervisor
1. Click **"My Profile"** in sidebar
2. Scroll to **"Reports To"** section (left sidebar)
3. See supervisor's:
   - Photo
   - Name
   - Email
   - Role badge

### View Your KPI Goals
1. Click **"My Performance"** in sidebar
2. Switch to **"KPI Goals"** tab
3. View all active goals:
   - Goal title and description
   - Category and weightage
   - Target values
   - Timeline
   - Who set the goal

### View Performance Reviews
1. Click **"My Performance"** in sidebar
2. Stay on **"Performance Reviews"** tab
3. See all submitted reviews
4. Click **"View Details"** on any review
5. See:
   - Overall score and rating
   - Individual goal achievements
   - Strengths and improvements
   - Supervisor comments
   - Action plan
6. Click **"Acknowledge Review"** to accept
   - OR **"Dispute Review"** to challenge (requires comments)

## 🎯 Features Overview

### Manager Capabilities:
- ✅ Create unlimited KPI goals
- ✅ 8 goal categories available
- ✅ Set custom targets and weightages
- ✅ Submit detailed performance reviews
- ✅ Auto-calculate achievement percentages
- ✅ Track team performance
- ✅ Search and filter team members

### Employee Capabilities:
- ✅ View assigned supervisor
- ✅ Access all assigned KPI goals
- ✅ Review performance evaluations
- ✅ Acknowledge or dispute reviews
- ✅ Add comments and feedback
- ✅ Track personal performance history

## 📊 Sample Workflow

```
1. Manager creates 5 KPI goals for John Doe (Jan-Jun 2025)
   ↓
2. John sees goals in "My Performance" → "KPI Goals"
   ↓
3. John works on achieving the goals over 6 months
   ↓
4. End of period: Manager creates performance review
   ↓
5. Manager evaluates each goal with actual achievements
   ↓
6. System calculates overall score automatically
   ↓
7. Manager adds feedback and submits review
   ↓
8. John receives review in "My Performance" → "Performance Reviews"
   ↓
9. John reviews detailed evaluation
   ↓
10. John acknowledges review with optional comments
```

## 🔑 Quick Tips

**For Managers:**
- Set SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)
- Distribute weightages to total 100% across goals
- Be specific in comments for each goal
- Define clear action plans for employee development
- Submit reviews promptly at end of period

**For Employees:**
- Check KPI goals regularly
- Understand what's expected (targets and weightages)
- Track your own progress
- Read reviews carefully before responding
- Provide constructive feedback when acknowledging/disputing

## 📞 Support

**Check Application Status:**
- Backend: http://localhost:5000/api/health
- Frontend: http://localhost:5173

**Common Issues:**
- Can't see Team Performance menu? → Check your role (must be manager/admin/hr)
- Goals not loading? → Ensure you have team members assigned
- Review submission fails? → Check all required fields are filled

## 🎨 UI Navigation

**Manager View:**
```
Sidebar → Team Performance
├── KPI Goals (Create/View goals)
├── Performance Reviews (Create/View reviews)
└── Team Members (View team)
```

**Employee View:**
```
Sidebar → My Profile
└── Reports To section (View supervisor)

Sidebar → My Performance
├── Performance Reviews (View/Respond)
└── KPI Goals (View assigned goals)
```

---

**System is ready to use!** Start managing your team's performance today. 🚀

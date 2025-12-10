# Employee Performance Review - Quick Start Guide

## 🚀 Accessing the Feature

### Step 1: Login as Employee
- **URL:** http://localhost:5173
- **Email:** employee@pvara.com
- **Password:** employee123

### Step 2: Navigate to Performance Review
- Click **"My Performance"** in the left sidebar (Award icon)

### Step 3: Explore the Features

#### Tab 1: Performance Reviews
- View all submitted performance reviews from your supervisor
- Click **"View Details"** on any review to see:
  - Overall rating and score
  - Individual KPI goal achievements
  - Progress bars for each goal
  - Supervisor's comments
  - Strengths and areas for improvement
  - Action plan for development
  
- **Actions Available:**
  - **Acknowledge Review**: Accept the review (with optional comments)
  - **Dispute Review**: Challenge the review (requires explanation)

#### Tab 2: KPI Goals
- View all active goals set by your supervisor
- See goal details:
  - Category (Quality, Productivity, etc.)
  - Target values and units
  - Weightage percentage
  - Goal period (start/end dates)
  - Who set the goal

## 📊 Sample Data Available

### Current Period (Jan - Jun 2025)
**5 Active KPI Goals:**
1. Complete 10 Client Projects (Productivity, 25%)
2. Achieve 95% Code Quality Score (Quality, 20%)
3. Reduce Task Completion Time (Efficiency, 15%)
4. Customer Satisfaction Rating (Customer Service, 20%)
5. Team Collaboration Score (Teamwork, 20%)

### Past Reviews
**Review 1 (Jul - Dec 2024):**
- Status: Submitted (Pending Your Acknowledgment)
- Rating: Exceeds Expectations
- Overall Score: 98%
- 5 goals evaluated with achievements

**Review 2 (Jan - Jun 2024):**
- Status: Acknowledged
- Rating: Exceeds Expectations
- Overall Score: 96%
- 3 goals evaluated

## 🎯 Key Features to Try

1. **View Detailed Review:**
   - Click "View Details" on the submitted review
   - Scroll through individual goal achievements
   - Read supervisor's feedback

2. **Acknowledge a Review:**
   - Open the submitted review
   - Add your comments (optional)
   - Click "Acknowledge Review"
   - Status changes to "Acknowledged"

3. **Dispute a Review:**
   - Open the submitted review
   - Add your comments (REQUIRED)
   - Click "Dispute Review"
   - Your concerns are recorded

4. **Track Your Goals:**
   - Switch to "KPI Goals" tab
   - View all active goals
   - See targets and weightage
   - Know what's expected

## 💡 Tips

- **Statistics Dashboard**: Top of page shows summary (total reviews, acknowledged count, active goals, average score)
- **Color Coding**: 
  - Green = Outstanding/Acknowledged
  - Blue = Exceeds Expectations
  - Yellow = Submitted/Needs Improvement
  - Red = Disputed/Unsatisfactory
- **Progress Bars**: Visual representation of goal achievement percentages
- **Responsive Design**: Works on mobile, tablet, and desktop

## 🔐 Role-Based Access

- **Employee Role**: Can view their own reviews and goals only
- **Supervisor/Manager/HR/Admin**: Can create goals and submit reviews (future enhancement)

## 📝 Review Workflow

1. Supervisor sets KPI goals → Employee sees in "KPI Goals" tab
2. Review period ends → Supervisor evaluates and submits review
3. Review appears in employee's "Performance Reviews" (Status: Submitted)
4. Employee reviews the evaluation
5. Employee acknowledges OR disputes
6. Status updates to "Acknowledged" or "Disputed"

## 🎨 UI Elements

- **Cards**: Each review/goal is in a card with hover effects
- **Badges**: Status and category indicators
- **Modal**: Full-screen detailed review view
- **Icons**: Visual indicators for actions and categories
- **Gradients**: Modern cyan/blue/purple color scheme

## 🧪 Testing the Feature

Try these actions:
1. ✅ Login as employee
2. ✅ Click "My Performance"
3. ✅ View both tabs (Reviews & Goals)
4. ✅ Click "View Details" on a review
5. ✅ Add comments in the text area
6. ✅ Click "Acknowledge Review"
7. ✅ Verify status changes to "Acknowledged"

## 📞 Support

If you encounter any issues:
- Check that both servers are running (backend: 5000, frontend: 5173)
- Verify login credentials are correct
- Ensure MongoDB container is running
- Check browser console for errors

---

**Ready to explore your performance reviews!** 🎉

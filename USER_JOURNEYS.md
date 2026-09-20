# KineTic User Journeys

## Trainer Journey

### 1. Onboarding & Setup
**Entry Point:** Sign up as trainer via AuthPage
- Create trainer profile (name, email, specialization)
- Set up authentication credentials
- Access trainer dashboard

### 2. Dashboard Overview
**Screen:** TrainerDashboard (`/trainer`)
- **Key Metrics View:**
  - Today's scheduled sessions count
  - Completed sessions today
  - Clients needing attention (missed workouts, inactivity, new photos)
- **Recent Activity Feed:** Latest client actions
- **Quick Actions:** Navigate to clients or plans

### 3. Client Management
**Screen:** TrainerClients (`/trainer/clients`)
- **View All Clients:** List with status indicators
  - **On Track:** Good adherence, recent activity
  - **At Risk:** Missed workouts, declining adherence
  - **Inactive:** No recent activity
  - **New:** Recently onboarded
- **Filter & Search:** Filter by status, search by name
- **Add New Client:** Modal to invite/link new client

### 4. Client Detail View
**Screen:** ClientDetail (`/trainer/clients/:clientId`)
- **Performance Summary:**
  - Total workouts completed
  - Adherence rate percentage
  - Current weight with change tracking
- **Weight Progress Chart:** Visual trend over time
- **Recent Workouts:** Last 5 sessions with status
- **Latest Photos:** Progress photo grid
- **Recent Activity Timeline:** Client actions
- **Quick Actions:**
  - Assign workout plan
  - Log measurement

### 5. Workout Programme Management
**Screen:** WorkoutPlans (`/trainer/plans`)
- **View All Programmes:** List with metadata
  - Programme title
  - Number of days/exercises
  - Assigned client (if any)
  - Status (active/draft)
- **Create New Programme:** Navigate to plan builder
- **Edit Existing Programme:** Modify exercises, sets, reps

### 6. Plan Builder
**Screen:** PlanBuilder (`/trainer/plans/new` or `/trainer/plans/:planId/edit`)
- **Programme Details:** Title, description, duration
- **Day Structure:** Add workout days
- **Exercise Selection:** Add exercises to each day
- **Set & Rep Configuration:** Define volume per exercise
- **Assign to Client:** Link programme to specific client
- **Save & Publish:** Make programme active

---

## Client Journey

### 1. Onboarding & Setup
**Entry Point:** Sign up as client via AuthPage
- Create client profile (name, email, goals)
- Link with trainer (via invite code or direct link)
- Access client dashboard

### 2. Daily Dashboard
**Screen:** ClientDashboard (`/app`)
- **Personalized Greeting:** "GOOD MORNING, [Name]"
- **Today's Workout Card:**
  - Workout title
  - Exercise count and duration
  - Circular progress indicator (if in progress)
  - Continue/Start button
- **Today's Activity:**
  - Weekly workout count
  - Completed workout list with checkmarks
- **Progress Overview:**
  - Weight with change tracking
  - Adherence rate
  - Streak counter
- **Quick Actions:** Navigate to workouts or progress

### 3. Workout Schedule
**Screen:** ClientWorkouts (`/app/workouts`)
- **Weekly View:** 7-day workout calendar
- **Workout Cards:**
  - Upcoming: Scheduled future workouts
  - Completed: Finished sessions with status
  - Missed: Skipped workouts
- **Status Indicators:** Visual badges for each workout state
- **Start Workout:** Navigate to session view

### 4. Workout Session
**Screen:** WorkoutSession (`/app/workouts/:sessionId`)
- **Exercise-by-Exercise Flow:**
  - Large exercise name and instructions
  - Set/rep input fields
  - Weight input (if applicable)
  - Previous performance reference
- **Progress Tracking:**
  - Current exercise indicator
  - Total exercises remaining
  - Session timer
- **Completion:**
  - Feeling rating (1-5 stars)
  - Notes field
  - Achievement celebration
- **Save & Exit:** Log session data

### 5. Progress Tracking
**Screen:** ClientProgress (`/app/progress`)
- **Weight Tab:**
  - Current weight display
  - Weekly change indicator
  - Bar chart showing weight over weeks
  - Before/after photo comparison
- **Goals Tab:**
  - Workout goals list
  - Circular progress per goal
  - Exercise count per goal
- **Actions:**
  - Log new weight
  - Upload progress photo

### 6. Profile Management
**Screen:** ClientProfile (`/app/profile`)
- **View Profile:**
  - Name
  - Phone
  - Join date
- **Edit Profile:**
  - Update name
  - Update phone
- **Sign Out:** Logout from app

---

## Key Interactions

### Trainer → Client
- **Assign Workout Plan:** Trainer creates programme → Assigns to client → Client sees scheduled workouts
- **Log Measurement:** Trainer logs client's weight/measurements → Client sees updated progress
- **Review Progress:** Trainer views client's activity → Provides feedback (future feature)

### Client → Trainer
- **Complete Workout:** Client finishes session → Trainer sees completion in activity feed
- **Upload Photo:** Client adds progress photo → Trainer notified (future feature)
- **Miss Workout:** Client skips session → Trainer sees in "needs attention" list

---

## Navigation Structure

### Trainer Navigation (Bottom Bar)
- **Dashboard:** Overview and quick stats
- **Clients:** Client list and management
- **Programmes:** Workout plan library

### Client Navigation (Bottom Bar)
- **Home:** Daily dashboard and today's workout
- **Workouts:** Weekly schedule and history
- **Progress:** Weight tracking and goals
- **Profile:** Personal settings

---

## Value Propositions

### For Trainers
- **Efficient Client Management:** Status system highlights clients needing attention
- **Data-Driven Insights:** Performance metrics and adherence tracking
- **Scalable Programming:** Reusable workout plans and templates
- **Remote Monitoring:** Track client progress without in-person sessions

### For Clients
- **Personalized Experience:** Tailored workouts from their trainer
- **Clear Progress Tracking:** Visual feedback on weight and performance
- **Accountability:** Adherence tracking and streak gamification
- **Convenient Access:** Complete workouts anytime, anywhere

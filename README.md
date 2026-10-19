# KineTic - Trainer-Client Fitness Platform

A comprehensive fitness training platform connecting trainers with clients for personalized workout programs, progress tracking, and goal management.

## Features

### For Trainers
- Client management and communication
- Workout plan creation and assignment
- Progress tracking and monitoring
- Goal review and adjustment system
- Activity timeline and insights

### For Clients
- Personalized workout programs
- Progress tracking with measurements and photos
- Goal setting with trainer review
- Workout session logging
- Mobile-responsive interface

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Version Control**: GitHub

## Getting Started

### Prerequisites
- Node.js 18+ 
- Supabase account
- GitHub account
- Vercel account

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/kinetic.git
cd kinetic/project
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**
- Create a new project in Supabase
- Run the migrations in `supabase/migrations/`
- Copy your Supabase URL and anon key

4. **Configure environment variables**
Create a `.env.local` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. **Run development server**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Database Setup

### Required Tables
Run the migrations in order:
1. `001_initial_schema.sql` - Core tables (profiles, sessions, plans, etc.)
2. `002_notifications.sql` - Notification system
3. `003_invitations.sql` - Client invitation system
4. `004_onboarding.sql` - Client goals and trainer goal reviews
5. `005_template_plans.sql` - Allows unassigned (template) workout plans
6. `006_audit_fixes.sql` - `onboarding_completed` column, trainer goal review permissions, cross-user notifications
7. `007_photo_storage.sql` - Private `progress-photos` storage bucket and access policies

### Invite emails (Edge Function)
Invitation codes are emailed by the `send-invite` Edge Function using [Resend](https://resend.com).

```bash
supabase functions deploy send-invite --project-ref <ref>
supabase secrets set --project-ref <ref> RESEND_API_KEY=... INVITE_FROM_EMAIL="KineTic <invites@yourdomain.com>" APP_URL=https://your-app.vercel.app
```

### Additional Tables for Onboarding
```sql
-- Add onboarding field to profiles
ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create client goals table
CREATE TABLE client_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id),
  goal TEXT NOT NULL,
  starting_weight DECIMAL,
  target_weight DECIMAL,
  timeline TEXT,
  additional_targets TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Deployment

### 1. GitHub Setup
```bash
git add .
git commit -m "Initial commit - KineTic platform"
git branch -M main
git remote add origin https://github.com/yourusername/kinetic.git
git push -u origin main
```

### 2. Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables in Vercel dashboard
4. Deploy

### 3. Supabase Configuration
- Add your Vercel domain to Supabase allowed origins
- Configure Row Level Security (RLS) policies
- Set up storage buckets for progress photos

## Environment Variables

Required for production:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

## Testing

The app includes mock data for testing. To disable mock data and use real data:

1. Change `const [useMockData] = useState(true)` to `false` in:
   - `src/pages/trainer/TrainerDashboard.tsx`
   - `src/pages/trainer/TrainerClients.tsx`
   - `src/pages/trainer/WorkoutPlans.tsx`
   - `src/pages/trainer/TrainerProfile.tsx`
   - `src/pages/client/ClientDashboard.tsx`
   - `src/pages/client/ClientWorkouts.tsx`
   - `src/pages/client/ClientProgress.tsx`
   - `src/pages/client/ClientProfile.tsx`

## Role-Based Access

### Trainer
- Dashboard: `/trainer`
- Clients: `/trainer/clients`
- Workout Plans: `/trainer/plans`
- Profile: `/trainer/profile`

### Client
- Onboarding: `/onboarding` (first time only)
- Dashboard: `/app`
- Workouts: `/app/workouts`
- Progress: `/app/progress`
- Profile: `/app/profile`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for your own fitness platform.

## Support

For issues and questions, please open an issue on GitHub or contact support@kinetic.com
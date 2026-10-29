import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { PRIVACY_CONTACT_EMAIL, PRIVACY_VERSION } from '../../lib/privacy'

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'Who we are',
    body: 'KineTic is a coaching app that connects personal trainers with their clients. The app is currently in beta testing, so features may change and we may contact you about your experience.',
  },
  {
    title: 'What we collect',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Account details: your name, email address and whether you are a trainer or client.</li>
        <li>Profile details you choose to add, such as phone number, location and bio.</li>
        <li>Fitness goals and intake answers: targets, deadlines, experience, schedule, equipment and preferences.</li>
        <li><strong>Health information:</strong> injuries, pain, medical conditions, doctor restrictions, sleep, stress and resting heart rate or blood pressure if you log them.</li>
        <li>Body measurements and progress photos.</li>
        <li>Workout plans, sessions and the sets, reps and weights you log.</li>
        <li>Feedback you send us, including the page you were on and your browser type.</li>
      </ul>
    ),
  },
  {
    title: 'Why we use it',
    body: 'To provide the coaching service: so your trainer can plan safe, suitable training, so you can track progress towards your goals, and so we can fix problems and improve the app during the beta. We do not sell your information or use it for advertising.',
  },
  {
    title: 'Your health information',
    body: 'Under the Protection of Personal Information Act (POPIA), health information is special personal information. We only process it with your explicit consent, which you give when you create your account. You can withdraw consent at any time by asking us to delete your account; we will then stop processing it, which means we can no longer provide coaching through the app.',
  },
  {
    title: 'Who can see it',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>You.</li>
        <li>Trainers whose invitation you accept, only while you are linked to them. If the link ends, they lose access to new goal readings.</li>
        <li>Our service providers, who host the app and store data on our behalf: Supabase (database, sign-in and photo storage) and Vercel (website hosting). Their servers may be outside South Africa; they are bound by data-protection terms that offer comparable protection.</li>
      </ul>
    ),
  },
  {
    title: 'How we protect it',
    body: 'All traffic is encrypted. Database access rules ensure each person can only read their own data and that of clients linked to them. Progress photos are stored privately and only shown through short-lived links.',
  },
  {
    title: 'How long we keep it',
    body: 'For as long as your account is active. If you ask us to delete your account, we delete your personal information unless the law requires us to keep it.',
  },
  {
    title: 'Your rights',
    body: (
      <>
        You can ask to see, correct or delete your information, and you can object to how we use it. You also have the right to complain to the Information Regulator of South Africa (
        <a href="https://inforegulator.org.za" target="_blank" rel="noreferrer" className="font-semibold text-[#1787c4] underline">inforegulator.org.za</a>
        ).
      </>
    ),
  },
  {
    title: 'Not medical advice',
    body: 'KineTic and your trainer do not replace a doctor. If you have a medical condition, injury or pain, get medical clearance before training.',
  },
  {
    title: 'Contact us',
    body: PRIVACY_CONTACT_EMAIL ? (
      <>
        Email <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="font-semibold text-[#1787c4] underline">{PRIVACY_CONTACT_EMAIL}</a> for any privacy request, or use the Send feedback button in the app.
      </>
    ) : (
      'Use the Send feedback button in the app for any privacy request.'
    ),
  },
]

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f7fbfd] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/auth" className="mb-8 inline-flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-[11px] bg-[#075a38] text-[#68d6e8]">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-[19px] font-semibold tracking-tight text-[#0f2a3a]">
            kinetic<span className="text-[#f3263a]">.</span>
          </span>
        </Link>
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-[#0f2a3a]">Privacy notice</h1>
          <p className="mt-1 text-xs text-[#64748b]">Version {PRIVACY_VERSION}</p>
          <div className="mt-6 space-y-6">
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="text-sm font-semibold text-[#0f2a3a]">{s.title}</h2>
                <div className="mt-1.5 text-sm leading-relaxed text-[#475569]">{s.body}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

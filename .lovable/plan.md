

# 💊 Medicine Prescription & Reminder System

A clean, clinical-looking web application connecting **Doctors**, **Medical Stores**, and **Patients** — built with React, Tailwind CSS, and Supabase.

---

## 🔐 Authentication & Roles

- **Sign-up & Login** pages with email/password authentication via Supabase Auth
- During sign-up, users select their role: **Doctor**, **Medical Store**, or **Patient**
- Role-based routing — each role sees a different dashboard after login
- Roles stored securely in a separate `user_roles` table (not on profiles) to prevent privilege escalation

---

## 👨‍⚕️ Doctor Panel

- **Dashboard** showing overview of recent prescriptions and linked patients
- **Create Prescription** form with:
  - Medicine name, dosage, frequency, and duration
  - Timing instructions (before/after food, morning/afternoon/night)
  - Option to attach files (reports, images) via Supabase Storage
- **Assign Prescription** by entering a patient's phone number or email to link it
- **Assign to Medical Store** by entering the store's registered email
- **Enable Reminders** toggle — sets up timed notifications for the patient
- **Prescription History** — list of all prescriptions created, with filters

---

## 🏥 Medical Store Panel

- **Dashboard** showing incoming prescriptions from doctors
- **Prescription Checklist** — view each prescription's medicine list
- **Status Management** — mark each prescription as:
  - 🟡 Pending
  - 🟢 Ready
  - ✅ Given (handed to patient)
- **Prescription History** with search and filter
- Status change triggers an **in-app notification** to the patient (e.g., "Your medicine is ready for pickup")

---

## 👤 Patient Panel

- **Dashboard** showing today's medicines and upcoming reminders
- **View Doctor Prescriptions** — see all prescriptions assigned by doctors, with attached files
- **Add Own Prescription** — manually enter medicines and set reminders for personal use
- **Medicine Reminders**:
  - In-app notification bell with unread count
  - Browser push notifications at scheduled medicine times
  - "Medicine ready" notification from medical store
- **Tracking** — mark each medicine dose as ✅ Taken or ❌ Missed
- **History** — view past prescriptions and adherence (taken vs. missed)

---

## 🔔 Notification System

- **In-app notifications** — a notification bell in the header with a dropdown showing recent alerts
- **Browser notifications** — permission prompt on login; push notifications for medicine reminders
- Notification types:
  - ⏰ "Time to take [Medicine Name]"
  - 📦 "Your prescription is ready at [Store Name]"
  - 📋 "New prescription from Dr. [Name]"

---

## 🎨 Design & UX

- **Clean & clinical** design: white and blue tones, professional typography, clear hierarchy
- Responsive layout for desktop and tablet
- Simple navigation sidebar per role
- Cards-based layout for prescriptions and reminders
- Status badges with color coding (pending/ready/given, taken/missed)

---

## 🗄️ Backend (Supabase)

- **Database tables**: profiles, user_roles, prescriptions, prescription_medicines, reminders, notifications, store_prescriptions
- **Row-Level Security (RLS)** ensuring doctors see only their prescriptions, patients see only theirs, and stores see only assigned ones
- **Supabase Storage** for file attachments (reports, images)
- **Edge Functions** for scheduled reminder logic (cron-based)


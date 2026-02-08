# *Bytewave* 
* leader - Chirag Behere
* Member 2- Vedika Girase
* Member 3-Satyam Sonar
* Member 4-Laxmi Sonawane


# 🏥 Prescription-pal

### Smart Digital Prescription & Medicine Reminder Platform

> A hospital-ready web platform that digitizes prescriptions, improves medicine adherence, and streamlines coordination between doctors, medical stores, and patients.

---

## 🚨 Problem Statement

In many hospitals and clinics:

* Prescriptions are handwritten and error-prone
* Patients forget to take medicines on time
* Doctors repeatedly enter the same patient details
* Medical stores struggle with prescription clarity
* There is no centralized reminder or tracking system

These gaps lead to **missed doses, delayed treatment, and poor patient outcomes**.

---

## 💡 Our Solution – MediMind

**MediMind** is a role-based healthcare web application that:

* Digitizes prescriptions
* Automates medicine reminders
* Connects doctors, medical stores, and patients on one platform
* Reduces manual work and human errors

Designed to be **simple, scalable, and hospital-ready**.

---

## 🎯 Key Features

### 👨‍⚕️ Doctor Dashboard

* Secure login
* Create digital prescriptions
* Add medicines with dosage & timings
* Assign prescriptions to patients and medical stores
* Enable automated reminders

---

### 🏥 Medical Store Dashboard

* View doctor prescriptions
* Prepare medicines
* Update status:

  * Pending
  * Ready
  * Given

---

### 👤 Patient Dashboard

* View doctor prescriptions
* Add own prescriptions manually
* Receive browser-based medicine reminders
* Track medicine intake:

  * Taken
  * Missed

---

## 🔄 System Workflow

```
Doctor → Creates Prescription
        ↓
Medical Store ← Prepares Medicines
        ↓
Patient ← Views Prescription & Receives Reminders
```

All roles operate on a **single centralized system**.

---

## 🧠 Why MediMind is Different

* ❌ No handwritten prescriptions
* ⏰ Automated medicine reminders
* 📊 Medicine intake tracking
* 🔐 Role-based access control
* 🌐 Web-based (no app install required)
* 📱 Easily extendable to mobile apps

---

## 🛠️ Tech Stack

### Frontend

* HTML
* CSS
* JavaScript
* Bootstrap (UI enhancement)

### Backend

* Node.js
* Express.js

### Database

* MySQL (primary)
* MongoDB (optional alternative)

### Notifications

* Browser Notifications
* JavaScript Timers
* Backend Cron Jobs

---

## 📁 Project Structure

```
medimind-website/
│
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   └── controllers/
│
├── frontend/
│   ├── login.html
│   ├── doctor.html
│   ├── patient.html
│   ├── medical.html
│   ├── css/
│   └── js/
│
└── README.md
```

---

## 🗃️ Database Schema (Simplified)

**Users**

* id, name, email, password, role

**Prescriptions**

* id, doctor_id, patient_id, medical_id, date, notes

**Medicines**

* id, prescription_id, name, dosage, duration

**Reminders**

* id, patient_id, medicine_id, time, status

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/medimind.git
cd medimind
```

### 2️⃣ Backend Setup

```bash
cd backend
npm install
node server.js
```

### 3️⃣ Frontend

Open `frontend/login.html` in your browser.

---

## ✅ MVP Scope (Hackathon Ready)

✔ Role-based login
✔ Doctor creates prescriptions
✔ Patient views prescriptions
✔ Browser notification reminders

---

## 🔮 Future Enhancements

* Mobile app (Flutter)
* Alarm-based reminders
* Automated call reminders
* QR-based patient registration
* Doctor queue & token system
* AI-based medicine adherence analysis

---

## 🧪 Use Cases

* Hospitals & Clinics
* Medical Stores
* Elderly Patient Care
* Rural Healthcare Systems
* Hackathons & Academic Projects

---

## 🌍 Impact

* Reduces missed medication doses
* Improves patient adherence
* Saves doctors’ time
* Minimizes prescription errors
* Digitizes small and medium healthcare centers

---

## 🏆 Hackathon Readiness

* Real-world healthcare problem
* Scalable architecture
* Production-inspired workflow
* Clean UI & UX
* High social impact

---

## 👥 Team

* **Project Name:** MediMind
* **Domain:** Healthcare Technology
* **Built For:** Hackathons & Innovation Challenges

---

## 📜 License

This project is developed for educational, innovation, and hackathon purposes.

---

### 🔥 Pro Hackathon Tip

Add **screenshots**, **short demo video**, and a **live link** in this README — judges love visual proof.

If you want next:

* 🎥 Demo video script
* 🖼️ Screenshot checklist
* 📊 Architecture diagram
* 🧾 Pitch deck content

Just say the word 🚀

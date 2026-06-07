# 🗣️ Guftagu (گفتگو)

> **An Agentic AI Speaking-Confidence Companion for Children (Ages 6–14)**

---

## 📖 About The Project

**Guftagu** (Urdu for *"conversation"* or *"dialogue"*) is an AI-powered mobile application that helps children aged **6–14 in Karachi** develop speaking confidence through daily 3–5 minute conversations with culturally rooted AI characters.

The app addresses a critical gap in Pakistan's EdTech landscape — zero solutions exist for verbal confidence building. Children consume endless content but never learn to express themselves. **Guftagu changes that.**

---

## 🎭 The Three Characters

| Character | Age Group | Persona | Theme Color |
|-----------|-----------|---------|-------------|
| **Zara** | 10–14 years | 16-year-old from Saddar, Karachi. Casual Urdu-English mix. Warm but challenging. | 🟣 `#7C5CBF` |
| **Robo Bhaya** | 6–9 years | Quirky robot-uncle. Energetic, funny, says "BEEP BOOP". | 🔵 `#2196F3` |
| **Ustad Sahab** | 12–14 years | Wise mentor figure. Respectful, gives real feedback. | 🟢 `#4CAF50` |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native, Expo, React Navigation |
| **Styling** | StyleSheet API, Expo Linear Gradient |
| **Animations** | React Native Animated API, Lottie |
| **Video** | expo-video |
| **Audio Recording** | expo-av |
| **AI Brain** | OpenAI GPT-3.5-turbo |
| **Speech-to-Text** | OpenAI Whisper |
| **Text-to-Speech** | ElevenLabs |
| **Backend** | Firebase Firestore, Firebase Auth |
| **Version Control** | GitHub |

---

## 👥 Team & Roles

| Member | Role | Key Contributions |
|--------|------|-------------------|
| **Izhan Waheed** (2312392) | Team Lead & AI Integration | Overall architecture, Expo setup, navigation stack, session screen, Gemini API, ElevenLabs TTS, Whisper STT, video state machine, GitHub management, end-to-end debugging |
| **Iman Shahzad** (2312370) | UI/UX Designer | Character designs (Zara, Robo Bhaya, Ustad Sahab), color palette, visual identity, wireframes, interactive prototypes, kid-friendly UI improvements, emotional connection design |
| **Ebad ur Rehman** (2312362) | Backend Developer | Firebase project setup, Firestore collections, Anonymous & Email Authentication, security rules, backend deployment |
| **Piyush Vatwani** (2312381) | AI Research & Backend Support | Agentic workflow research, Firestore schema design, Firebase security rules documentation, input validation across all screens, VPC documentation, COPPA compliance checklist |

---

## 🔄 App Flow

```
Splash Screen → Age Gate → Parent Consent → Name Input → Character Selection
→ Session Screen → Session Complete → Dashboard → Parent Portal → Parent Dashboard
```

---

## 🛡️ COPPA 2025 Compliance

- ✅ Raw audio deleted immediately after transcription
- ✅ No voice biometrics stored
- ✅ Math-quiz VPC (Verifiable Parental Consent) gate
- ✅ Anonymous Firebase Auth only
- ✅ Parent data deletion capability
- ✅ Age gate at onboarding

---

## 📁 Repository Structure

```
Guftagu/
├── assets/
│   ├── characters/       # Character images (Zara, Robo, Ustad)
│   ├── videos/           # 12 video files (4 states × 3 characters)
│   ├── voices/           # ElevenLabs audio files
│   └── fonts/            # Poppins family (5 weights)
├── src/
│   ├── screens/          # All UI screens
│   ├── services/         # API integrations (Gemini, Whisper, ElevenLabs, Firebase)
│   ├── navigation/       # React Navigation stack
│   └── hooks/            # Custom hooks (usePreloadAssets)
└── firestore.rules       # COPPA-compliant security rules
```

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/izhan77/Guftagu.git

# Install dependencies
cd Guftagu
npm install

# Start Expo development server
npx expo start
```

---

## 📄 License

Academic Project — SZABIST University, Karachi

---

## 🔗 Links

- **GitHub Repository:** [github.com/izhan77/Guftagu](https://github.com/izhan77/Guftagu)
- **Supervisor:** Muhammad Suleman
- **Course:** CSC-4101 Artificial Intelligence, Spring 2026

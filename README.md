# 📔 Live Journal

A beautiful, feature-rich MERN stack journaling application with voice journaling, AI-powered insights, and premium user experience.

![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express%205-339933?logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?logo=vite&logoColor=white)

## ✨ Features

### 📝 Core Journaling
- **Rich Text Editor** - Create beautifully formatted journal entries
- **Voice Journaling** - Record your thoughts using VAPI AI integration
- **Smart Search** - AI-powered semantic search across all entries
- **Auto-save Drafts** - Never lose your thoughts with automatic draft saving

### 🎯 Unique Features
- **⏰ Time Capsules** - Seal messages for your future self with customizable unlock dates
- **📖 Life Chapters** - Organize your life into meaningful chapters and milestones
- **🌟 Highlights** - Curate and showcase your best journal moments
- **📅 Calendar View** - Visualize your journaling journey with holiday integration
- **🔥 Streaks** - Track your journaling consistency with gamification

### 🤖 AI-Powered
- **Mood Analysis** - Automatic sentiment detection for entries
- **Smart Insights** - AI-generated reflections and patterns
- **Voice Commands** - Control the app with natural language

### 🎨 Premium Experience
- **Dark/Light Mode** - Beautiful themes for any preference
- **Multi-language Support** - i18n with 9 languages (EN, ES, FR, DE, HI, TE, AR, ZH, JA)
- **Smooth Animations** - Framer Motion powered transitions
- **Responsive Design** - Perfect on desktop and mobile

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| Vite 7 | Build Tool |
| SCSS | Styling |
| Framer Motion | Animations |
| React Router 7 | Navigation |
| Jotai | State Management |
| i18next | Internationalization |
| Lucide React | Icons |
| VAPI AI | Voice Integration |

### Backend
| Technology | Purpose |
|------------|---------|
| Express 5 | API Framework |
| MySQL | Database |
| JWT | Authentication |
| OpenAI | AI Features |
| Nodemailer | Email Service |
| Node-cron | Scheduled Jobs |

## 📁 Project Structure

```
Live Journal/
├── FE/livejournal-frontend/     # React Frontend
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   ├── pages/               # Page components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── i18n/                # Translation files
│   │   └── utils/               # Helper functions
│   └── public/                  # Static assets
│
└── livejournal-backend/         # Express Backend
    ├── controllers/             # Route handlers
    ├── routes/                  # API routes
    ├── middleware/              # Auth middleware
    ├── utils/                   # Helper utilities
    └── jobs/                    # Cron jobs
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Dinesh123527/Live-Journal.git
cd Live-Journal
```

2. **Setup Backend**
```bash
cd livejournal-backend
npm install

# Create .env file with:
# DB_HOST=localhost
# DB_USER=your_user
# DB_PASSWORD=your_password
# DB_NAME=livejournal
# JWT_SECRET=your_secret
# OPENAI_API_KEY=your_key

npm run dev
```

3. **Setup Frontend**
```bash
cd FE/livejournal-frontend
npm install
npm run dev
```

4. **Open in browser**
```
http://localhost:5173
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |

### Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | List all entries |
| POST | `/api/entries` | Create entry |
| PUT | `/api/entries/:id` | Update entry |
| DELETE | `/api/entries/:id` | Delete entry |

### Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/time-capsules` | Time capsule management |
| GET/POST | `/api/life-chapters` | Life chapters management |
| GET | `/api/analytics` | User analytics & streaks |
| POST | `/api/search` | AI-powered search |

## 🎨 Screenshots

*Coming Soon*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Dinesh** - [GitHub](https://github.com/Dinesh123527)

---

<p align="center">Made with ❤️ and ☕</p>

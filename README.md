🚀 AI Interview Preparation Platform

An AI-powered interview preparation platform that analyzes a user's resume against a job description to identify skill gaps and generate interview preparation material.

The system integrates Google Gemini AI with a full-stack architecture (React + Node.js + MongoDB) to create an intelligent career preparation tool.

✨ Features

🔍 Resume vs Job Description Analysis – Detect missing skills using AI
 🎯 Interview Question Generator – Technical & behavioral questions
 
 📚 Preparation Plan Generator – Personalized learning roadmap
 
 📄 ATS Resume Generator – Resume optimized for job descriptions
 
 📄 PDF Resume Upload – Extracts text from resumes for AI analysis
 
 🔐 Secure Authentication – JWT login system with bcrypt password hashing
 
 🛡 Token Blacklisting – Secure logout by invalidating JWT tokens

🛠 Tech Stack

Frontend
 React.js
 React Router
 SCSS
 Axios
 Context API

Backend

 Node.js
 
 Express.js
 
 MongoDB Atlas
 
 Mongoose

AI Integration

 Google Gemini AI (@google/generative-ai)

Authentication

 JWT
 
 bcryptjs
 
 Cookie-based sessions
 

🏗 Architecture

React Frontend
      │
      ▼
Node.js + Express Backend
      │
      ▼
Google Gemini AI
      │
      ▼
MongoDB Atlas


🔐 Authentication Flow

1.Register

 Validate email & username
 
 Password hashed with bcrypt
 
 JWT stored in cookies
 
2.Login

 Password verification
 
 JWT issued for session
 
3.Logout

 Token added to blacklist
 
 Prevents reuse of stolen tokens
 

 🤖 AI Capabilities
 
The platform uses Google Gemini AI to:

 Compare Resume vs Job Description
 
 Detect Skill Gaps
 
 Generate Interview Questions
 
 Create Preparation Plans
 
 Generate ATS-friendly resumes
 
AI responses are returned as structured JSON to ensure reliable backend processing.


🚀 Getting Started

Clone Repository

git clone https://github.com/yourusername/ai-interview-platform.git

cd ai-interview-platform

Install Dependencies

Backend

cd backend

npm install

Frontend

cd frontend

npm install

Run the Project

Backend

npm run dev

Frontend

npm run dev


👨‍💻 Author

Saksham Thakur

Full Stack Developer | Java | React | AI Systems

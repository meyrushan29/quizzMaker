import { Routes, Route, Navigate } from "react-router-dom"
import Home from "./pages/Home"
import TeacherLogin from "./pages/TeacherLogin"
import TeacherForgotPassword from "./pages/TeacherForgotPassword"
import StudentJoin from "./pages/StudentJoin"

import TeacherLayout from "./layouts/TeacherLayout"
import Dashboard from "./pages/teacher/Dashboard"
import Students from "./pages/teacher/Students"
import Quizzes from "./pages/teacher/Quizzes"
import QuizEditor from "./pages/teacher/QuizEditor"
import QuestionBank from "./pages/teacher/QuestionBank"
import LiveHub from "./pages/teacher/LiveHub"
import LiveControl from "./pages/teacher/LiveControl"
import Results from "./pages/teacher/Results"
import ResultDetail from "./pages/teacher/ResultDetail"
import StudentAnalysis from "./pages/teacher/StudentAnalysis"
import Analytics from "./pages/teacher/Analytics"
import Reports from "./pages/teacher/Reports"
import Settings from "./pages/teacher/Settings"

import StudentLayout from "./layouts/StudentLayout"
import StudentHome from "./pages/student/StudentHome"
import StudentQuiz from "./pages/student/StudentQuiz"
import StudentResult from "./pages/student/StudentResult"
import StudentHistory from "./pages/student/StudentHistory"

import { RequireTeacher, RequireStudent } from "./lib/auth"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/teacher/login" element={<TeacherLogin />} />
      <Route path="/teacher/forgot-password" element={<TeacherForgotPassword />} />
      <Route path="/student" element={<StudentJoin />} />

      <Route
        path="/teacher"
        element={
          <RequireTeacher>
            <TeacherLayout />
          </RequireTeacher>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentAnalysis />} />
        <Route path="quizzes" element={<Quizzes />} />
        <Route path="quizzes/new" element={<QuizEditor />} />
        <Route path="quizzes/:id" element={<QuizEditor />} />
        <Route path="question-bank" element={<QuestionBank />} />
        <Route path="live" element={<LiveHub />} />
        <Route path="live/:quizId" element={<LiveControl />} />
        <Route path="results" element={<Results />} />
        <Route path="results/:quizId" element={<ResultDetail />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route
        path="/student"
        element={
          <RequireStudent>
            <StudentLayout />
          </RequireStudent>
        }
      >
        <Route path="app" element={<StudentHome />} />
        <Route path="quiz/:sessionId" element={<StudentQuiz />} />
        <Route path="result/:sessionId" element={<StudentResult />} />
        <Route path="history" element={<StudentHistory />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

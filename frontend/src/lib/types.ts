export interface Quiz {
  id: number
  title: string
  subject: string
  grade: string
  chapter: string | null
  description: string | null
  duration: number
  total_marks: number
  passing_percentage: number
  randomize_questions: boolean
  randomize_options: boolean
  show_result_immediately: boolean
  allow_retake: boolean
  allow_late_join: boolean
  leaderboard_visible: boolean
  quiz_code: string | null
  status: "draft" | "live_lobby" | "live_active" | "completed"
  started_at: string | null
  ends_at: string | null
  created_by: number
  created_at: string
  question_count: number
}

export interface QuizDetail extends Quiz {
  questions: Question[]
}

export interface Question {
  id: number
  quiz_id: number
  order_index: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: "A" | "B" | "C" | "D"
  marks: number
  topic: string | null
  difficulty: string | null
}

export interface BankQuestion {
  id: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: "A" | "B" | "C" | "D"
  marks: number
  subject: string | null
  grade: string | null
  chapter: string | null
  topic: string | null
  difficulty: string | null
  created_by: number
  created_at: string
}

export interface Student {
  id: number
  student_id: string
  name: string
  grade: string | null
  class_name: string | null
  subject: string | null
  status: string
  created_at: string
}

export interface DashboardStats {
  total_students: number
  total_quizzes: number
  completed_quizzes: number
  average_class_score: number
  highest_score: number
  lowest_score: number
  recent_quizzes: {
    id: number
    title: string
    date: string
    questions: number
    students: number
    average_score: number | null
    status: string
  }[]
}

export interface MonitorState {
  quiz_id: number
  quiz_code: string | null
  status: string
  total_questions: number
  ends_at: string | null
  joined_count: number
  completed: number
  answering: number
  not_started: number
  students: {
    student_id: string
    name: string
    session_id: number
    answered: number
    total_questions: number
    status: string
    score: number | null
    percentage: number | null
  }[]
}

export interface SessionState {
  session_id: number
  quiz_id: number
  quiz_title: string
  quiz_code: string | null
  quiz_status: string
  session_status: string
  duration: number
  ends_at: string | null
  current_index: number
  questions: StudentQuestion[]
}

export interface StudentQuestion {
  id: number
  question_text: string
  marks: number
  options: { key: string; text: string }[]
  selected_answer: string | null
}

export interface ResultData {
  session_id: number
  student_name: string
  student_id: string
  quiz_title: string
  score: number
  total_marks: number
  percentage: number
  correct: number
  wrong: number
  unanswered: number
  time_taken_seconds: number | null
  performance_message: string
  passed: boolean
}

export interface ClassAnalysis {
  quiz_id: number
  quiz_title: string
  num_students: number
  average: number
  highest: number
  lowest: number
  median: number
  pass_rate: number
  fail_rate: number
  score_distribution: Record<string, number>
  ranking: {
    rank: number
    db_id: number
    student_id: string
    name: string
    score: number
    total_marks: number
    percentage: number
    time_taken_seconds: number | null
  }[]
}

export interface QuestionAnalysis {
  quiz_id: number
  total_attempts: number
  questions: {
    question_number: number
    question_id: number
    question_text: string
    correct_answer: string
    topic: string | null
    difficulty: string | null
    response_counts: { A: number; B: number; C: number; D: number; unanswered: number }
    accuracy: number
  }[]
  difficult_questions: { question_number: number; question_text: string; accuracy: number }[]
}

export interface TopicAnalysis {
  quiz_id?: number
  topics: { topic: string; questions: number; correct: number; accuracy: number }[]
  needs_improvement: { topic: string; questions: number; correct: number; accuracy: number }[]
}

export interface StudentAnalysis {
  student_id: string
  name: string
  total_quizzes: number
  average_percentage: number
  highest_score: number
  lowest_score: number
  improvement_percentage: number
  trend_status: string
  trend: { quiz_id: number; quiz_title: string; date: string; score: number; total_marks: number; percentage: number }[]
  topics: { topic: string; questions: number; correct: number; accuracy: number }[]
  weak_topics: { topic: string; questions: number; correct: number; accuracy: number }[]
}

export interface Overview {
  average_score: number
  pass_rate: number
  students_needing_attention: number
  topic_performance: { topic: string; accuracy: number }[]
  student_performance: { student_id: string; name: string; average: number; highest: number; lowest: number; trend: string }[]
  at_risk_students: { student_id: string; name: string; average: number }[]
  at_risk_threshold: number
}

export interface HistoryEntry {
  quiz_id: number
  quiz_title: string
  subject: string
  chapter: string | null
  date: string
  score: number
  total_marks: number
  percentage: number
}

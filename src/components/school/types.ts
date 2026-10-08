// ============ Shared types for EduTrack ============

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'TEACHER' | 'PARENT'
}

export interface Level {
  id: string
  name: string
  cycle: string
  order: number
}

export interface ClassInfo {
  id: string
  name: string
  levelId: string
  room: string | null
  capacity: number
  level: Level
  mainTeacher?: { id: string; name: string } | null
  _count?: { students: number }
}

export interface Subject {
  id: string
  name: string
  color: string | null
}

export interface Period {
  id: string
  name: string
  order: number
  startDate: string | null
  endDate: string | null
  active: boolean
}

export interface Teacher {
  id: string
  name: string
  email: string
}

export interface Lookups {
  levels: Level[]
  classes: ClassInfo[]
  subjects: Subject[]
  periods: Period[]
  teachers: Teacher[]
}

export interface Guardian {
  id: string
  relation: string
  user: { id: string; name: string; email: string; phone: string | null }
}

export interface Student {
  id: string
  matricule: string
  firstName: string
  lastName: string
  gender: string
  birthDate: string | null
  massarCode: string | null
  status: string
  enrolledAt: string
  notes: string | null
  klass: ClassInfo | null
  guardians?: Guardian[]
  _count?: { payments: number; attendances: number }
}

export interface Registration {
  id: string
  studentId: string
  schoolYear: string
  type: string
  date: string
  status: string
  feePaid: boolean
  feeAmount: number
  note: string | null
  student: Student & { klass: ClassInfo | null }
}

export interface Payment {
  id: string
  studentId: string
  schoolYear: string
  month: number
  label: string
  amount: number
  dueDate: string
  paidDate: string | null
  status: string
  method: string | null
  receiptNo: string | null
  student: Student & { klass: ClassInfo | null }
}

export interface Homework {
  id: string
  title: string
  description: string
  dueDate: string
  createdAt: string
  klass: { id: string; name: string }
  subject: { id: string; name: string; color: string | null }
  teacher: { id: string; name: string }
}

export interface Evaluation {
  id: string
  title: string
  type: string
  maxScore: number
  date: string
  klass: { id: string; name: string }
  subject: { id: string; name: string; color: string | null }
  teacher: { id: string; name: string }
  period: { id: string; name: string }
  _count?: { grades: number }
}

export interface Announcement {
  id: string
  title: string
  content: string
  audience: string
  pinned: boolean
  createdAt: string
  author: { id: string; name: string; role: string }
  klass?: { name: string } | null
}

export interface ComplaintMessage {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string; role: string }
}

export interface Complaint {
  id: string
  subject: string
  category: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  author: { id: string; name: string; role: string }
  student?: { id: string; firstName: string; lastName: string; klass?: { name: string } } | null
  messages?: ComplaintMessage[]
  _count?: { messages: number }
  lastMessage?: ComplaintMessage[] | ComplaintMessage
}

export interface Attendance {
  id: string
  date: string
  type: string
  justified: boolean
  reason: string | null
  student: {
    id: string
    firstName: string
    lastName: string
    matricule: string
    klass?: { name: string } | null
  }
  recorder?: { name: string } | null
}

// ============ View keys ============

export type ViewKey =
  | 'dashboard'
  | 'students'
  | 'registrations'
  | 'payments'
  | 'homeworks'
  | 'grades'
  | 'attendance'
  | 'timetable'
  | 'announcements'
  | 'complaints'
  | 'settings'

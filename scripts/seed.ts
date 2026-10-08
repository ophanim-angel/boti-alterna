/**
 * Seed script for EduTrack — École Al Manar
 * Run: bun scripts/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import { scryptSync, randomBytes } from 'crypto'

const db = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

const PW = hashPassword('demo1234')

function d(dateStr: string): Date {
  return new Date(dateStr)
}

async function main() {
  console.log('🌱 Suppression des données existantes...')
  await db.grade.deleteMany()
  await db.evaluation.deleteMany()
  await db.homework.deleteMany()
  await db.complaintMessage.deleteMany()
  await db.complaint.deleteMany()
  await db.announcement.deleteMany()
  await db.attendance.deleteMany()
  await db.payment.deleteMany()
  await db.registration.deleteMany()
  await db.guardianRelation.deleteMany()
  await db.student.deleteMany()
  await db.timetableSession.deleteMany()
  await db.teachingAssignment.deleteMany()
  await db.class.deleteMany()
  await db.level.deleteMany()
  await db.subject.deleteMany()
  await db.period.deleteMany()
  await db.user.deleteMany()

  // ================= USERS =================
  console.log('👥 Utilisateurs...')
  const admin = await db.user.create({
    data: {
      email: 'direction@almanar.ma',
      password: PW,
      name: 'Rachid Benali',
      role: 'ADMIN',
      phone: '0661-234-567',
    },
  })

  const teachersData = [
    { email: 's.benali@almanar.ma', name: 'Samira El Fassi', phone: '0662-111-222' },
    { email: 'k.amrani@almanar.ma', name: 'Karim Amrani', phone: '0663-333-444' },
    { email: 'n.ouazzani@almanar.ma', name: 'Nadia Ouazzani', phone: '0664-555-666' },
    { email: 'y.tazi@almanar.ma', name: 'Youssef Tazi', phone: '0665-777-888' },
    { email: 'm.cherkaoui@almanar.ma', name: 'Meryem Cherkaoui', phone: '0666-999-000' },
    { email: 'h.idrissi@almanar.ma', name: 'Hicham Idrissi', phone: '0667-121-314' },
  ]
  const teachers: { id: string; name: string }[] = []
  for (const t of teachersData) {
    const u = await db.user.create({ data: { ...t, password: PW, role: 'TEACHER' } })
    teachers.push({ id: u.id, name: u.name })
  }

  const parentsData = [
    { email: 'f.bahatem@gmail.com', name: 'Fatima Bahatem', phone: '0670-101-101' },
    { email: 'm.gazzouba@gmail.com', name: 'Meryem Gazzouba', phone: '0671-202-202' },
    { email: 'a.jaidi@gmail.com', name: 'Ahmed Jaidi', phone: '0672-303-303' },
    { email: 's.kimakh@gmail.com', name: 'Salma Kimakh', phone: '0673-404-404' },
    { email: 'o.ouadaa@gmail.com', name: 'Omar Ouadaa', phone: '0674-505-505' },
    { email: 'l.bennis@gmail.com', name: 'Leila Bennis', phone: '0675-606-606' },
    { email: 'r.berrada@gmail.com', name: 'Rim Berrada', phone: '0676-707-707' },
    { email: 'k.alaoui@gmail.com', name: 'Khalid Alaoui', phone: '0677-808-808' },
    { email: 'n.mansouri@gmail.com', name: 'Nawal Mansouri', phone: '0678-909-909' },
    { email: 't.chraibi@gmail.com', name: 'Tarik Chraïbi', phone: '0679-110-110' },
    { email: 'h.benjelloun@gmail.com', name: 'Hind Benjelloun', phone: '0680-220-220' },
    { email: 'm.tahiri@gmail.com', name: 'Mounir Tahiri', phone: '0681-330-330' },
  ]
  const parents: { id: string; name: string }[] = []
  for (const p of parentsData) {
    const u = await db.user.create({ data: { ...p, password: PW, role: 'PARENT' } })
    parents.push({ id: u.id, name: u.name })
  }

  // ================= LEVELS =================
  console.log('🏫 Niveaux & classes...')
  const levelsData = [
    { name: 'Petite Section', cycle: 'Maternelle', order: 1 },
    { name: 'Moyenne Section', cycle: 'Maternelle', order: 2 },
    { name: 'Grande Section', cycle: 'Maternelle', order: 3 },
    { name: 'CP', cycle: 'Primaire', order: 4 },
    { name: 'CE1', cycle: 'Primaire', order: 5 },
    { name: 'CE2', cycle: 'Primaire', order: 6 },
    { name: 'CM1', cycle: 'Primaire', order: 7 },
    { name: 'CM2', cycle: 'Primaire', order: 8 },
    { name: '1ère Année Collège', cycle: 'Collège', order: 9 },
    { name: '2ème Année Collège', cycle: 'Collège', order: 10 },
  ]
  const levels: Record<string, { id: string }> = {}
  for (const l of levelsData) {
    levels[l.name] = await db.level.create({ data: l })
  }

  // ================= SUBJECTS =================
  const subjectsData = [
    { name: 'Français', color: '#8b5cf6' },
    { name: 'Mathématiques', color: '#10b981' },
    { name: 'Arabe', color: '#f59e0b' },
    { name: 'Éveil Scientifique', color: '#06b6d4' },
    { name: 'Éducation Islamique', color: '#14b8a6' },
    { name: 'Anglais', color: '#f97316' },
    { name: 'Informatique', color: '#6366f1' },
    { name: 'EPS', color: '#ef4444' },
  ]
  const subjects: Record<string, { id: string; name: string }> = {}
  for (const s of subjectsData) {
    subjects[s.name] = await db.subject.create({ data: s })
  }

  // ================= CLASSES =================
  const classesData = [
    { name: 'PS - G1', level: 'Petite Section', teacher: teachers[4], room: 'S-01' },
    { name: 'MS - G1', level: 'Moyenne Section', teacher: teachers[5], room: 'S-02' },
    { name: 'GS - A', level: 'Grande Section', teacher: teachers[2], room: 'S-03' },
    { name: 'GS - B', level: 'Grande Section', teacher: teachers[2], room: 'S-04' },
    { name: 'CP - A', level: 'CP', teacher: teachers[0], room: 'P-11' },
    { name: 'CP - B', level: 'CP', teacher: teachers[4], room: 'P-12' },
    { name: 'CE1 - A', level: 'CE1', teacher: teachers[1], room: 'P-13' },
    { name: 'CE2 - A', level: 'CE2', teacher: teachers[3], room: 'P-14' },
    { name: 'CM1 - A', level: 'CM1', teacher: teachers[1], room: 'P-15' },
    { name: 'CM2 - A', level: 'CM2', teacher: teachers[3], room: 'P-16' },
    { name: '1AC - A', level: '1ère Année Collège', teacher: teachers[0], room: 'C-21' },
  ]
  const classes: Record<string, { id: string; name: string }> = {}
  for (const c of classesData) {
    const created = await db.class.create({
      data: {
        name: c.name,
        levelId: levels[c.level].id,
        mainTeacherId: c.teacher.id,
        room: c.room,
        capacity: 28,
      },
    })
    classes[c.name] = { id: created.id, name: created.name }
  }

  // ================= TEACHING ASSIGNMENTS =================
  const subjectList = Object.values(subjects)
  for (const klass of Object.values(classes)) {
    const chosen = subjectList.slice(0, 5)
    for (let i = 0; i < chosen.length; i++) {
      const teacher = teachers[i % teachers.length]
      await db.teachingAssignment.create({
        data: { teacherId: teacher.id, subjectId: chosen[i].id, classId: klass.id },
      })
    }
  }

  // ================= PERIODS =================
  console.log('📅 Périodes...')
  const period1 = await db.period.create({
    data: {
      name: '1er Trimestre',
      order: 1,
      startDate: d('2025-09-04'),
      endDate: d('2025-11-28'),
      active: false,
    },
  })
  await db.period.create({
    data: {
      name: '2ème Trimestre',
      order: 2,
      startDate: d('2025-12-01'),
      endDate: d('2026-03-13'),
      active: true,
    },
  })
  await db.period.create({
    data: {
      name: '3ème Trimestre',
      order: 3,
      startDate: d('2026-03-16'),
      endDate: d('2026-06-20'),
      active: false,
    },
  })
  const p1 = period1
  const p2 = await db.period.findFirst({ where: { order: 2 } })
  const p3 = await db.period.findFirst({ where: { order: 3 } })

  // ================= STUDENTS + GUARDIANS =================
  console.log('🎒 Élèves & familles...')
  const studentsData: Array<{
    first: string; last: string; gender: string; klass: string; birth: string;
    parents: number[]; status?: string;
  }> = [
    // --- famille originale (parents 0-5) ---
    { first: 'Elene', last: 'Ouadaa', gender: 'F', klass: 'GS - A', birth: '2020-03-12', parents: [0, 4] },
    { first: 'Jad', last: 'Afif', gender: 'M', klass: 'GS - A', birth: '2020-01-25', parents: [1] },
    { first: 'Aya', last: 'Bennis', gender: 'F', klass: 'GS - A', birth: '2020-05-02', parents: [5] },
    { first: 'Yassine', last: 'Kimakh', gender: 'M', klass: 'GS - B', birth: '2020-02-14', parents: [3] },
    { first: 'Mohamed Haytem', last: 'Nhaila', gender: 'M', klass: 'CP - A', birth: '2019-09-08', parents: [3] },
    { first: 'Lina', last: 'Jaidi', gender: 'F', klass: 'CP - A', birth: '2019-06-21', parents: [2] },
    { first: 'Adam', last: 'Bahatem', gender: 'M', klass: 'CP - A', birth: '2019-04-17', parents: [0] },
    { first: 'Sofia', last: 'Gazzouba', gender: 'F', klass: 'CP - B', birth: '2019-11-30', parents: [1] },
    { first: 'Rayan', last: 'Ouadaa', gender: 'M', klass: 'CP - B', birth: '2019-08-19', parents: [4] },
    { first: 'Rayhan', last: 'El Aarch', gender: 'F', klass: 'CE1 - A', birth: '2018-05-10', parents: [0, 2] },
    { first: 'Amir', last: 'Bennis', gender: 'M', klass: 'CE1 - A', birth: '2018-02-27', parents: [5] },
    { first: 'Maryam', last: 'Jaidi', gender: 'F', klass: 'CE1 - A', birth: '2018-07-04', parents: [2] },
    { first: 'Anas', last: 'Kimakh', gender: 'M', klass: 'CE2 - A', birth: '2017-03-15', parents: [3] },
    { first: 'Hiba', last: 'Gazzouba', gender: 'F', klass: 'CE2 - A', birth: '2017-10-09', parents: [1] },
    { first: 'Ilyas', last: 'Ouazzani', gender: 'M', klass: 'CE2 - A', birth: '2017-12-01', parents: [1, 4] },
    { first: 'Zineb', last: 'El Fassi', gender: 'F', klass: 'CM1 - A', birth: '2016-01-22', parents: [5] },
    { first: 'Omar', last: 'Nhaila', gender: 'M', klass: 'CM1 - A', birth: '2016-06-06', parents: [3] },
    { first: 'Salma', last: 'Tazi', gender: 'F', klass: 'CM1 - A', birth: '2016-09-18', parents: [0] },
    { first: 'Youssef', last: 'Bahatem', gender: 'M', klass: 'CM2 - A', birth: '2015-04-03', parents: [0] },
    { first: 'Nour', last: 'Jaidi', gender: 'F', klass: 'CM2 - A', birth: '2015-08-11', parents: [2] },
    { first: 'Mehdi', last: 'Gazzouba', gender: 'M', klass: 'CM2 - A', birth: '2015-02-28', parents: [1] },
    { first: 'Ines', last: 'Ouadaa', gender: 'F', klass: 'CM2 - A', birth: '2015-11-15', parents: [4] },
    { first: 'Fatima', last: 'Bahatem', gender: 'F', klass: '1AC - A', birth: '2014-05-20', parents: [0] },
    { first: 'Karim', last: 'Ouadaa', gender: 'M', klass: '1AC - A', birth: '2014-07-30', parents: [4] },
    { first: 'Sara', last: 'Kimakh', gender: 'F', klass: '1AC - A', birth: '2014-03-09', parents: [3] },
    { first: 'Hamza', last: 'Bennis', gender: 'M', klass: '1AC - A', birth: '2014-10-12', parents: [5], status: 'INACTIVE' },
    // --- nouveaux élèves (parents 0-11, familles élargies) ---
    { first: 'Aya', last: 'Berrada', gender: 'F', klass: 'PS - G1', birth: '2022-02-18', parents: [6] },
    { first: 'Adam', last: 'Chraïbi', gender: 'M', klass: 'PS - G1', birth: '2022-04-09', parents: [9] },
    { first: 'Lina', last: 'Belkhayat', gender: 'F', klass: 'PS - G1', birth: '2022-06-27', parents: [10, 7] },
    { first: 'Youssef', last: 'Amrani', gender: 'M', klass: 'PS - G1', birth: '2022-01-15', parents: [7] },
    { first: 'Sofia', last: 'Lamrani', gender: 'F', klass: 'PS - G1', birth: '2022-08-03', parents: [11] },
    { first: 'Rayan', last: 'Sqalli', gender: 'M', klass: 'PS - G1', birth: '2022-03-30', parents: [6, 11] },
    { first: 'Nour', last: 'El Idrissi', gender: 'F', klass: 'MS - G1', birth: '2021-05-22', parents: [8] },
    { first: 'Anas', last: 'Tazi', gender: 'M', klass: 'MS - G1', birth: '2021-09-14', parents: [9, 10] },
    { first: 'Malak', last: 'Benjelloun', gender: 'F', klass: 'MS - G1', birth: '2021-11-02', parents: [10] },
    { first: 'Omar', last: 'Alaoui', gender: 'M', klass: 'MS - G1', birth: '2021-07-19', parents: [7, 8] },
    { first: 'Sara', last: 'Kettani', gender: 'F', klass: 'MS - G1', birth: '2021-04-25', parents: [8] },
    { first: 'Ilyas', last: 'Hakimi', gender: 'M', klass: 'MS - G1', birth: '2021-12-08', parents: [9] },
    { first: 'Kenza', last: 'Rahali', gender: 'F', klass: 'GS - A', birth: '2020-06-11', parents: [11, 6] },
    { first: 'Mehdi', last: 'Squalli', gender: 'M', klass: 'GS - A', birth: '2020-09-23', parents: [6] },
    { first: 'Lina', last: 'Berrada', gender: 'F', klass: 'GS - A', birth: '2020-02-05', parents: [10] },
    { first: 'Aya', last: 'Mansouri', gender: 'F', klass: 'GS - B', birth: '2020-04-19', parents: [8] },
    { first: 'Adam', last: 'Regragui', gender: 'M', klass: 'GS - B', birth: '2020-08-21', parents: [11] },
    { first: 'Salma', last: 'Belcaid', gender: 'F', klass: 'GS - B', birth: '2020-10-17', parents: [7, 9] },
    { first: 'Rayan', last: 'Lahlou', gender: 'M', klass: 'GS - B', birth: '2020-12-29', parents: [9] },
    { first: 'Ilham', last: 'Bouzidi', gender: 'F', klass: 'CP - A', birth: '2019-10-05', parents: [11, 8] },
    { first: 'Anas', last: 'Marrakchi', gender: 'M', klass: 'CP - A', birth: '2019-05-28', parents: [8] },
    { first: 'Hiba', last: 'Chraibi', gender: 'F', klass: 'CP - A', birth: '2019-01-31', parents: [9] },
    { first: 'Yassine', last: 'Berrada', gender: 'M', klass: 'CP - A', birth: '2019-07-07', parents: [6, 10] },
    { first: 'Maryam', last: 'Bennani', gender: 'F', klass: 'CP - B', birth: '2019-03-24', parents: [10] },
    { first: 'Adam', last: 'Sayeh', gender: 'M', klass: 'CP - B', birth: '2019-09-16', parents: [7] },
    { first: 'Lina', last: 'Skalli', gender: 'F', klass: 'CP - B', birth: '2019-12-11', parents: [11, 9] },
    { first: 'Omar', last: 'Benkirane', gender: 'M', klass: 'CP - B', birth: '2019-06-02', parents: [6] },
    { first: 'Rania', last: 'El Meliani', gender: 'F', klass: 'CE1 - A', birth: '2018-04-08', parents: [8, 11] },
    { first: 'Youssef', last: 'Doukkali', gender: 'M', klass: 'CE1 - A', birth: '2018-06-30', parents: [11] },
    { first: 'Aya', last: 'Chraïbi', gender: 'F', klass: 'CE1 - A', birth: '2018-08-13', parents: [9] },
    { first: 'Hamza', last: 'Belhaj', gender: 'M', klass: 'CE1 - A', birth: '2018-11-26', parents: [10, 6] },
    { first: 'Salma', last: 'Alaoui', gender: 'F', klass: 'CE2 - A', birth: '2017-05-06', parents: [7] },
    { first: 'Anas', last: 'Berrady', gender: 'M', klass: 'CE2 - A', birth: '2017-08-27', parents: [8] },
    { first: 'Malak', last: 'Sqalli', gender: 'F', klass: 'CE2 - A', birth: '2017-02-12', parents: [9, 11] },
    { first: 'Nada', last: 'Benjelloun', gender: 'F', klass: 'CM1 - A', birth: '2016-03-17', parents: [10] },
    { first: 'Reda', last: 'Lamrani', gender: 'M', klass: 'CM1 - A', birth: '2016-07-09', parents: [6, 8] },
    { first: 'Ines', last: 'Tahiri', gender: 'F', klass: 'CM1 - A', birth: '2016-11-21', parents: [11] },
    { first: 'Walid', last: 'Rifai', gender: 'M', klass: 'CM1 - A', birth: '2016-01-04', parents: [7, 10] },
    { first: 'Assia', last: 'Bourkadi', gender: 'F', klass: 'CM2 - A', birth: '2015-06-14', parents: [8] },
    { first: 'Omar', last: 'Kabbaj', gender: 'M', klass: 'CM2 - A', birth: '2015-09-01', parents: [9, 6] },
    { first: 'Hiba', last: 'Zniber', gender: 'F', klass: 'CM2 - A', birth: '2015-12-19', parents: [10] },
    { first: 'Yasmine', last: 'Berrada', gender: 'F', klass: '1AC - A', birth: '2014-02-08', parents: [6] },
    { first: 'Mehdi', last: 'Alaoui', gender: 'M', klass: '1AC - A', birth: '2014-04-26', parents: [7, 11] },
    { first: 'Salma', last: 'Idrissi', gender: 'F', klass: '1AC - A', birth: '2014-08-15', parents: [11] },
  ]

  let matricule = 1001
  const students: { id: string; klassName: string; name: string }[] = []

  for (const s of studentsData) {
    const st = await db.student.create({
      data: {
        matricule: `M-${matricule++}`,
        firstName: s.first,
        lastName: s.last,
        gender: s.gender,
        birthDate: d(s.birth),
        massarCode: `${String.fromCharCode(65 + (matricule % 3))}${10000000 + matricule * 7}`,
        status: s.status || 'ACTIVE',
        classId: classes[s.klass].id,
        enrolledAt: d('2025-09-01'),
      },
    })
    students.push({ id: st.id, klassName: s.klass, name: `${s.first} ${s.last}` })

    for (const pIdx of s.parents) {
      await db.guardianRelation.create({
        data: {
          userId: parents[pIdx].id,
          studentId: st.id,
          relation: pIdx % 2 === 0 ? 'PERE' : 'MERE',
          isPrimary: true,
        },
      })
    }

    await db.registration.create({
      data: {
        studentId: st.id,
        schoolYear: '2025/2026',
        type: matricule % 3 === 0 ? 'NOUVELLE' : 'REINSCRIPTION',
        date: d('2025-07-0' + (1 + (matricule % 9))),
        status: 'VALIDEE',
        feePaid: matricule % 5 !== 0,
        feeAmount: 800,
      },
    })

    // Payments: Septembre -> Mars (mars = échéance à venir)
    const months = [
      { m: 9, label: 'Septembre 2025', due: '2025-09-10' },
      { m: 10, label: 'Octobre 2025', due: '2025-10-10' },
      { m: 11, label: 'Novembre 2025', due: '2025-11-10' },
      { m: 12, label: 'Décembre 2025', due: '2025-12-10' },
      { m: 1, label: 'Janvier 2026', due: '2026-01-10' },
      { m: 2, label: 'Février 2026', due: '2026-02-10' },
      { m: 3, label: 'Mars 2026', due: '2026-03-10' },
    ]
    for (const mo of months) {
      const r = (matricule + mo.m) % 7
      let status = 'EN_ATTENTE'
      let paidDate: Date | null = null
      let method: string | null = null
      if (mo.m === 3) {
        // échéance à venir : tout en attente
        status = 'EN_ATTENTE'
      } else if (r <= 3) {
        status = 'PAYE'
        paidDate = new Date(d(mo.due).getTime() - (r * 2 + 1) * 24 * 3600 * 1000)
        method = ['ESPECES', 'VIREMENT', 'CHEQUE', 'CARTE'][r % 4]
      } else if (r === 4 && new Date(mo.due) < new Date('2026-02-25')) {
        status = 'EN_RETARD'
      }
      await db.payment.create({
        data: {
          studentId: st.id,
          schoolYear: '2025/2026',
          month: mo.m,
          label: mo.label,
          amount: 650,
          dueDate: d(mo.due),
          paidDate,
          status,
          method,
          receiptNo: status === 'PAYE' ? `RCP-2025-${matricule}${mo.m}` : null,
        },
      })
    }
  }

  // ================= HOMEWORKS =================
  console.log('📚 Devoirs...')
  const hwData = [
    {
      klass: 'CP - A', subject: 'Français', teacher: 0,
      title: 'Exercices de lecture — syllabes "ou"',
      description: "Lire la page 12 du manuel et écrire les 10 mots de la liste dans le cahier de brouillon.",
      due: '2026-02-27',
    },
    {
      klass: 'CP - A', subject: 'Mathématiques', teacher: 1,
      title: "Additions et soustractions jusqu'à 100",
      description: "Faire les exercices 3 à 7 page 24 du cahier d'exercices. Bien écrire les retenues.",
      due: '2026-02-26',
    },
    {
      klass: 'CE1 - A', subject: 'Français', teacher: 1,
      title: 'Dictée préparée — le pluriel des noms',
      description: 'Préparer la dictée du vendredi : 8 phrases sur le pluriel des noms en -s, -x, -au.',
      due: '2026-02-27',
    },
    {
      klass: 'CE1 - A', subject: 'Mathématiques', teacher: 0,
      title: 'Tables de multiplication (x2, x5)',
      description: 'Réviser les tables de 2 et de 5. Feuille de calcul n°4 à compléter et à faire signer.',
      due: '2026-02-25',
    },
    {
      klass: 'CE2 - A', subject: 'Éveil Scientifique', teacher: 3,
      title: "Le cycle de l'eau — schéma",
      description: "Dessiner et légender le cycle de l'eau sur une feuille A4. Couleurs demandées.",
      due: '2026-02-28',
    },
    {
      klass: 'CM2 - A', subject: 'Mathématiques', teacher: 3,
      title: 'Fractions — exercices de simplification',
      description: 'Exercices 12 à 18 page 89. Simplifier les fractions et comparer.',
      due: '2026-02-26',
    },
    {
      klass: 'CM2 - A', subject: 'Français', teacher: 1,
      title: "Production écrite — récit d'aventure",
      description: "Rédiger un récit d'aventure de 15 lignes minimum en utilisant l'imparfait et le passé simple.",
      due: '2026-03-02',
    },
    {
      klass: '1AC - A', subject: 'Mathématiques', teacher: 0,
      title: 'Les nombres relatifs — série n°3',
      description: 'Série 3 : exercices 1 à 10. Addition et soustraction de nombres relatifs.',
      due: '2026-02-25',
    },
    {
      klass: '1AC - A', subject: 'Anglais', teacher: 5,
      title: 'Vocabulary unit 5 — Daily routine',
      description: 'Learn the 20 words from Unit 5 and write 10 sentences about your daily routine.',
      due: '2026-02-27',
    },
    {
      klass: 'GS - A', subject: 'Français', teacher: 2,
      title: 'Graphisme — les boucles',
      description: 'Compléter la fiche de graphisme n°6 (les grandes boucles). Bien tenir le crayon.',
      due: '2026-02-24',
    },
    // --- nouveaux devoirs (maternelle, CE2, CM1, 1AC) ---
    {
      klass: 'PS - G1', subject: 'EPS', teacher: 4,
      title: 'Motricité — parcours de motricité à la maison',
      description: "Réaliser un petit parcours (sauter, ramper, lancer) avec les parents et apporter un dessin de son parcours préféré.",
      due: '2026-02-26',
    },
    {
      klass: 'MS - G1', subject: 'Mathématiques', teacher: 5,
      title: 'Reconnaissance des chiffres de 1 à 20',
      description: "Compléter la fiche : relier les points de 1 à 20 et colorier le dessin mystère.",
      due: '2026-03-01',
    },
    {
      klass: 'GS - B', subject: 'Français', teacher: 2,
      title: 'Comptines — révision du trimestre',
      description: "Réciter la comptine « Pomme de reinette » et découper les images du cahier d'activités page 9.",
      due: '2026-02-25',
    },
    {
      klass: 'CP - B', subject: 'Français', teacher: 4,
      title: 'Écriture — les lignes seyès',
      description: "Écrire chaque mot de la liste 3 fois en respectant les interlignes. Vérifier les jambages.",
      due: '2026-02-27',
    },
    {
      klass: 'CE2 - A', subject: 'Mathématiques', teacher: 3,
      title: 'Tables de multiplication (x7, x8)',
      description: 'Apprendre les tables de 7 et 8. Faire la feuille de calcul n°6 en autonomie.',
      due: '2026-03-01',
    },
    {
      klass: 'CE2 - A', subject: 'Éveil Scientifique', teacher: 3,
      title: 'Les continents — carte à compléter',
      description: "Coller les étiquettes des continents sur la carte muette distribuée en classe.",
      due: '2026-02-10',
    },
    {
      klass: 'CM1 - A', subject: 'Français', teacher: 1,
      title: 'Lecture suivie — Le Petit Prince (chapitres 1 à 3)',
      description: "Lire les chapitres 1 à 3 et répondre aux questions de compréhension du carnet de lecture.",
      due: '2026-03-03',
    },
    {
      klass: 'CM1 - A', subject: 'Mathématiques', teacher: 3,
      title: 'Angles — mesure au rapporteur',
      description: 'Mesurer les 8 angles de la fiche n°2 et classer-les (aigu, obtus, droit).',
      due: '2026-02-24',
    },
    {
      klass: '1AC - A', subject: 'Français', teacher: 0,
      title: "Production écrite — lettre à un correspondant",
      description: "Rédiger une lettre de 12 lignes à un correspondant imaginaire : présentation, goûts, questions.",
      due: '2026-03-02',
    },
    {
      klass: '1AC - A', subject: 'Informatique', teacher: 5,
      title: 'Scratch — animer un sprite',
      description: "Créer un projet Scratch avec au moins 2 sprites et un dialogue. Sauvegarder le projet et l'apporter sur clé USB.",
      due: '2026-03-04',
    },
  ]
  for (const hw of hwData) {
    await db.homework.create({
      data: {
        title: hw.title,
        description: hw.description,
        classId: classes[hw.klass].id,
        subjectId: subjects[hw.subject].id,
        teacherId: teachers[hw.teacher].id,
        dueDate: d(hw.due),
      },
    })
  }

  // ================= EVALUATIONS + GRADES =================
  console.log('📝 Évaluations & notes...')
  const evalData = [
    { klass: 'CP - A', subject: 'Français', teacher: 0, period: p1, title: 'Contrôle n°1 — Lecture', type: 'CONTROLE', date: '2025-10-14', max: 20 },
    { klass: 'CP - A', subject: 'Français', teacher: 0, period: p1, title: 'Contrôle n°2 — Écriture', type: 'CONTROLE', date: '2025-11-12', max: 20 },
    { klass: 'CP - A', subject: 'Mathématiques', teacher: 1, period: p1, title: 'Contrôle n°1 — Numération', type: 'CONTROLE', date: '2025-10-16', max: 20 },
    { klass: 'CP - A', subject: 'Arabe', teacher: 2, period: p1, title: 'Contrôle — Lecture coranique', type: 'CONTROLE', date: '2025-10-21', max: 20 },
    { klass: 'CP - B', subject: 'Français', teacher: 4, period: p1, title: 'Contrôle n°1 — Lecture', type: 'CONTROLE', date: '2025-10-15', max: 20 },
    { klass: 'CP - B', subject: 'Mathématiques', teacher: 1, period: p2, title: 'Contrôle n°1 — Calcul', type: 'CONTROLE', date: '2026-02-13', max: 20 },
    { klass: 'CE1 - A', subject: 'Français', teacher: 1, period: p1, title: 'Contrôle n°1 — Grammaire', type: 'CONTROLE', date: '2025-10-15', max: 20 },
    { klass: 'CE1 - A', subject: 'Mathématiques', teacher: 0, period: p1, title: 'Examen 1er Trimestre', type: 'EXAMEN', date: '2025-11-25', max: 20 },
    { klass: 'CE1 - A', subject: 'Mathématiques', teacher: 0, period: p2, title: 'Contrôle — Calcul posé', type: 'CONTROLE', date: '2026-02-17', max: 20 },
    { klass: 'CE2 - A', subject: 'Éveil Scientifique', teacher: 3, period: p1, title: 'Contrôle — Les êtres vivants', type: 'CONTROLE', date: '2025-10-20', max: 20 },
    { klass: 'CE2 - A', subject: 'Français', teacher: 1, period: p1, title: 'Contrôle — Lecture suivie', type: 'CONTROLE', date: '2025-10-22', max: 20 },
    { klass: 'CE2 - A', subject: 'Arabe', teacher: 2, period: p2, title: 'Contrôle — Dictée arabe', type: 'CONTROLE', date: '2026-02-18', max: 20 },
    { klass: 'CE2 - A', subject: 'Éveil Scientifique', teacher: 3, period: p2, title: 'Projet — Maquette du volcan', type: 'PROJET', date: '2026-02-20', max: 20 },
    { klass: 'CM1 - A', subject: 'Mathématiques', teacher: 3, period: p1, title: 'Examen 1er Trimestre', type: 'EXAMEN', date: '2025-11-26', max: 20 },
    { klass: 'CM1 - A', subject: 'Français', teacher: 1, period: p2, title: 'Contrôle n°1 — Conjugaison', type: 'CONTROLE', date: '2026-02-19', max: 20 },
    { klass: 'CM1 - A', subject: 'Français', teacher: 1, period: p2, title: 'Oral — Lecture à voix haute', type: 'ORAL', date: '2026-02-21', max: 20 },
    { klass: 'CM2 - A', subject: 'Mathématiques', teacher: 3, period: p1, title: 'Examen 1er Trimestre', type: 'EXAMEN', date: '2025-11-26', max: 20 },
    { klass: 'CM2 - A', subject: 'Mathématiques', teacher: 3, period: p1, title: 'Contrôle n°2 — Problèmes', type: 'CONTROLE', date: '2025-10-28', max: 20 },
    { klass: 'CM2 - A', subject: 'Français', teacher: 1, period: p1, title: 'Contrôle n°2 — Conjugaison', type: 'CONTROLE', date: '2025-11-10', max: 20 },
    { klass: 'CM2 - A', subject: 'Mathématiques', teacher: 3, period: p2, title: 'Contrôle n°1 — Fractions', type: 'CONTROLE', date: '2026-02-14', max: 20 },
    { klass: 'CM2 - A', subject: 'Éveil Scientifique', teacher: 3, period: p2, title: 'Contrôle — Électricité', type: 'CONTROLE', date: '2026-02-18', max: 20 },
    { klass: '1AC - A', subject: 'Mathématiques', teacher: 0, period: p1, title: 'Examen 1er Trimestre', type: 'EXAMEN', date: '2025-11-27', max: 20 },
    { klass: '1AC - A', subject: 'Français', teacher: 0, period: p1, title: 'Examen 1er Trimestre', type: 'EXAMEN', date: '2025-11-28', max: 20 },
    { klass: '1AC - A', subject: 'Anglais', teacher: 5, period: p2, title: 'Contrôle — Unit 4 & 5', type: 'CONTROLE', date: '2026-02-20', max: 20 },
    { klass: '1AC - A', subject: 'Mathématiques', teacher: 0, period: p2, title: 'Contrôle — Relatifs', type: 'CONTROLE', date: '2026-02-24', max: 20 },
    { klass: 'GS - A', subject: 'Français', teacher: 2, period: p2, title: 'Évaluation — Reconnaissance des lettres', type: 'CONTROLE', date: '2026-02-10', max: 10 },
    { klass: 'GS - B', subject: 'Français', teacher: 2, period: p2, title: 'Évaluation — Graphisme et pré-écriture', type: 'CONTROLE', date: '2026-02-11', max: 10 },
    { klass: 'MS - G1', subject: 'Français', teacher: 5, period: p2, title: 'Évaluation — Graphisme', type: 'CONTROLE', date: '2026-02-12', max: 10 },
  ]
  const classStudents: Record<string, string[]> = {}
  for (const st of students) {
    if (!classStudents[st.klassName]) classStudents[st.klassName] = []
    classStudents[st.klassName].push(st.id)
  }

  for (const ev of evalData) {
    const e = await db.evaluation.create({
      data: {
        title: ev.title,
        type: ev.type,
        classId: classes[ev.klass].id,
        subjectId: subjects[ev.subject].id,
        teacherId: teachers[ev.teacher].id,
        periodId: ev.period!.id,
        maxScore: ev.max,
        date: d(ev.date),
      },
    })
    for (const stId of classStudents[ev.klass] || []) {
      const absent = Math.random() < 0.04
      const score = absent ? null : Math.round(ev.max * (0.45 + Math.random() * 0.55) * 2) / 2
      await db.grade.create({
        data: {
          evaluationId: e.id,
          studentId: stId,
          score,
          absent,
        },
      })
    }
  }

  // ================= ANNOUNCEMENTS =================
  console.log('📢 Annonces...')
  const annData = [
    {
      title: 'Réunion parents-professeurs — Samedi 7 mars',
      content:
        "Chers parents, la réunion trimestrielle parents-professeurs se tiendra samedi 7 mars de 9h à 13h dans les salles de classes. Votre présence est vivement souhaitée pour faire le point sur le parcours de votre enfant. Merci de confirmer votre venue auprès de l'administration.",
      audience: 'PARENTS', pinned: true, author: admin, classId: null as string | null,
    },
    {
      title: 'Sortie pédagogique au Musée Mohammed VI',
      content:
        "Les élèves de CE1, CE2 et CM1 bénéficieront d'une sortie pédagogique au Musée Mohammed VI des civilisations le jeudi 5 mars. Le transport est assuré par l'école. Merci de retourner l'autorisation signée avant le mardi 3 mars.",
      audience: 'TOUS', pinned: false, author: admin, classId: null as string | null,
    },
    {
      title: 'Journée portes ouvertes — Inscriptions 2026/2027',
      content:
        "L'école organise sa journée portes ouvertes le dimanche 15 mars de 10h à 17h. Invitez vos proches à venir découvrir nos locaux, rencontrer l'équipe pédagogique et s'informer sur le processus d'inscription pour l'année scolaire 2026/2027.",
      audience: 'TOUS', pinned: false, author: admin, classId: null as string | null,
    },
    {
      title: 'Conseil pédagogique — Validation des évaluations',
      content:
        "Chers collègues, merci de saisir toutes les notes du 2ème trimestre dans la plateforme avant le vendredi 28 février à 18h. Le conseil pédagogique se réunira le lundi 2 mars pour valider les évaluations.",
      audience: 'ENSEIGNANTS', pinned: false, author: admin, classId: null as string | null,
    },
    {
      title: "Kermesse de fin d'année — Appel aux bénévoles",
      content:
        "La kermesse annuelle se tiendra le samedi 30 mai. Les parents volontaires pour tenir des stands (gastronomie, jeux, brocante) sont invités à se manifester auprès de l'association des parents d'élèves.",
      audience: 'PARENTS', pinned: false, author: teachers[2], classId: null as string | null,
    },
    {
      title: 'Menu de la cantine — Mars 2026',
      content:
        "Le menu détaillé de la cantine pour le mois de mars est désormais disponible à l'accueil et sur la plateforme. Ce mois-ci : couscous du vendredi, poisson frais le mardi, et un nouveau menu végétarien chaque jeudi. N'hésitez pas à nous faire part de vos suggestions.",
      audience: 'TOUS', pinned: false, author: admin, classId: null as string | null,
    },
    {
      title: 'Tournoi inter-classes — Constitution des équipes',
      content:
        "Chers collègues, le tournoi inter-classes de fin d'année approche. Merci de constituer vos équipes (5 joueurs + 2 remplaçants) et de me transmettre les listes avant le 6 mars. Les matchs auront lieu pendant les heures d'EPS.",
      audience: 'ENSEIGNANTS', pinned: false, author: teachers[3], classId: null as string | null,
    },
    {
      title: 'Photos de classe — Jeudi prochain',
      content:
        "Le photographe scolaire viendra jeudi prochain. Merci de veiller à la tenue soignée des élèves. Les commandes de tirages se font auprès de l'administration.",
      audience: 'CLASSE', pinned: false, author: teachers[0], classId: classes['CP - A'].id,
    },
    {
      title: 'Sortie cinéma pédagogique — CM2 A',
      content:
        "Les élèves de CM2-A assisteront à une projection du film « Kirikou » au cinéma Rialto le mercredi 11 mars. Départ à 9h, retour à 12h15. Participation de 20 DH demandée.",
      audience: 'CLASSE', pinned: true, author: teachers[3], classId: classes['CM2 - A'].id,
    },
  ]
  for (const a of annData) {
    await db.announcement.create({
      data: {
        title: a.title,
        content: a.content,
        audience: a.audience,
        pinned: a.pinned,
        authorId: a.author.id,
        classId: a.classId,
      },
    })
  }

  // ================= COMPLAINTS =================
  console.log('💬 Réclamations...')
  const c1 = await db.complaint.create({
    data: {
      subject: 'Horaires de sortie — les cours finissent à quelle heure ?',
      category: 'SCOLARITE',
      status: 'EN_COURS',
      priority: 'NORMALE',
      authorId: parents[1].id,
      studentId: students[1].id,
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c1.id,
      authorId: parents[1].id,
      content: "Bonjour, pourriez-vous me confirmer à quelle heure finissent les cours de GS les mercredis ? Je souhaite organiser le transport de mon fils. Merci d'avance.",
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c1.id,
      authorId: admin.id,
      content: "Bonjour Madame Gazzouba, les cours de GS finissent à 15h45 les lundis, mardis, jeudis et vendredis, et à 12h30 le mercredi. L'accueil périscolaire est disponible jusqu'à 17h30 sur inscription. Cordialement, la Direction.",
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c1.id,
      authorId: parents[1].id,
      content: 'Merci beaucoup pour cette réponse rapide et claire !',
    },
  })

  const c2 = await db.complaint.create({
    data: {
      subject: 'Retard de livraison des manuels de français',
      category: 'AUTRE',
      status: 'OUVERTE',
      priority: 'HAUTE',
      authorId: parents[0].id,
      studentId: students[6].id,
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c2.id,
      authorId: parents[0].id,
      content: "Bonjour, le manuel de français n'a toujours pas été distribué aux élèves de CP-A alors que les autres classes l'ont reçu. Peut-on connaître la date de livraison prévue ?",
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c2.id,
      authorId: admin.id,
      content: "Bonjour Madame Bahatem, nous avons relancé le fournisseur. La livraison est attendue sous 10 jours. Nous communiquerons la date exacte dès confirmation. Merci de votre patience.",
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c2.id,
      authorId: parents[0].id,
      content: "Merci pour le suivi. En attendant, l'enseignante fournit des photocopies ? Mon fils me dit que oui, je voulais confirmer.",
    },
  })

  const c3 = await db.complaint.create({
    data: {
      subject: 'Problème de facturation — échéance de janvier',
      category: 'PAIEMENT',
      status: 'RESOLUE',
      priority: 'NORMALE',
      authorId: parents[5].id,
      studentId: students[2].id,
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c3.id,
      authorId: parents[5].id,
      content: "Bonjour, j'ai été débitée deux fois pour l'échéance de janvier. Merci de vérifier.",
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c3.id,
      authorId: admin.id,
      content: "Bonjour Madame Bennis, après vérification le doublon a été identifié et le remboursement a été initié. Il apparaîtra sur votre compte sous 5 jours ouvrés. Toutes nos excuses pour ce désagrément.",
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c3.id,
      authorId: parents[5].id,
      content: "C'est confirmé, le remboursement est bien arrivé. Merci pour votre réactivité !",
    },
  })

  const c4 = await db.complaint.create({
    data: {
      subject: 'Suivi disciplinaire — bavardages répétés en classe',
      category: 'DISCIPLINE',
      status: 'EN_COURS',
      priority: 'NORMALE',
      authorId: teachers[1].id,
      studentId: students[10].id,
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c4.id,
      authorId: teachers[1].id,
      content: "Bonjour Madame Bennis, je souhaite vous informer qu'Amir perturbe régulièrement le cours par des bavardages. Rien de grave, mais nous aimerions le soutenir ensemble : pouvez-vous en parler avec lui à la maison ?",
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c4.id,
      authorId: parents[5].id,
      content: "Bonjour Monsieur Amrani, merci pour votre retour et votre attention. Nous avons parlé avec Amir ce soir et nous allons suivre cela de près. N'hésitez pas à me tenir informée.",
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c4.id,
      authorId: teachers[1].id,
      content: "C'est noté, merci beaucoup pour votre coopération. Amir est un élève brillant quand il se concentre — travaillons main dans la main.",
    },
  })

  const c5 = await db.complaint.create({
    data: {
      subject: 'Cantine — allergie au gluten de ma fille',
      category: 'SANTE',
      status: 'OUVERTE',
      priority: 'HAUTE',
      authorId: parents[2].id,
      studentId: students[5].id,
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c5.id,
      authorId: parents[2].id,
      content: "Bonjour, ma fille Lina (CP-A) est allergique au gluten. Pouvons-nous mettre en place un repas adapté à la cantine ? Je fournis une ordonnance et un protocole du médecin si nécessaire. Merci de votre attention.",
    },
  })

  const c6 = await db.complaint.create({
    data: {
      subject: 'Demande de certificat de scolarité',
      category: 'SCOLARITE',
      status: 'FERMEE',
      priority: 'BASSE',
      authorId: parents[3].id,
      studentId: students[12].id,
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c6.id,
      authorId: parents[3].id,
      content: "Bonjour, j'ai besoin d'un certificat de scolarité pour Anas dans le cadre d'une démarche bancaire. Comment l'obtenir ?",
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c6.id,
      authorId: admin.id,
      content: "Bonjour Monsieur Kimakh, le certificat est disponible au bureau de la direction dès demain matin, ou en version électronique signée par email sur simple demande. Cordialement.",
    },
  })
  await db.complaintMessage.create({
    data: {
      complaintId: c6.id,
      authorId: parents[3].id,
      content: 'Parfait, je passerai demain. Merci !',
    },
  })

  // ================= ATTENDANCE =================
  console.log('🚫 Absences & retards...')
  const attendanceTypes = ['ABSENCE', 'RETARD']
  const reasons = ['Maladie', 'Rendez-vous médical', 'Raison familiale', 'Trafic', null, null]
  for (const st of students) {
    const n = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < n; i++) {
      const type = attendanceTypes[Math.floor(Math.random() * 2)]
      const reason = reasons[Math.floor(Math.random() * reasons.length)]
      const monthPool = [11, 12, 1, 2, 2]
      const month = monthPool[Math.floor(Math.random() * monthPool.length)]
      const year = month >= 9 ? 2025 : 2026
      await db.attendance.create({
        data: {
          studentId: st.id,
          date: d(`${year}-${String(month).padStart(2, '0')}-${String(3 + Math.floor(Math.random() * 18)).padStart(2, '0')}`),
          type,
          justified: reason !== 'Trafic' && reason !== null,
          reason,
          recordedById: teachers[0].id,
        },
      })
    }
  }

  // ================= TIMETABLE =================
  console.log('🕐 Emploi du temps...')
  const slots = [
    ['08:00', '09:00'], ['09:00', '10:00'], ['10:15', '11:15'],
    ['11:15', '12:15'], ['14:00', '15:00'], ['15:00', '16:00'],
  ]
  for (const k of Object.keys(classes)) {
    for (let day = 1; day <= 5; day++) {
      for (let s = 0; s < 4; s++) {
        const subj = subjectList[(day + s) % subjectList.length]
        const teacherIdx = (day + s) % teachers.length
        await db.timetableSession.create({
          data: {
            classId: classes[k].id,
            subjectId: subj.id,
            teacherId: teachers[teacherIdx].id,
            dayOfWeek: day,
            startTime: slots[s][0],
            endTime: slots[s][1],
            room: 'S-' + (10 + s),
          },
        })
      }
    }
  }

  console.log('✅ Seed terminé !')
  console.log(`   - ${await db.user.count()} utilisateurs (1 admin, ${await db.user.count({ where: { role: 'TEACHER' } })} enseignants, ${await db.user.count({ where: { role: 'PARENT' } })} parents)`)
  console.log(`   - ${await db.student.count()} élèves`)
  console.log(`   - ${await db.class.count()} classes`)
  console.log(`   - ${await db.registration.count()} inscriptions`)
  console.log(`   - ${await db.payment.count()} paiements`)
  console.log(`   - ${await db.homework.count()} devoirs`)
  console.log(`   - ${await db.evaluation.count()} évaluations`)
  console.log(`   - ${await db.grade.count()} notes`)
  console.log(`   - ${await db.announcement.count()} annonces`)
  console.log(`   - ${await db.complaint.count()} réclamations (${await db.complaintMessage.count()} messages)`)
  console.log(`   - ${await db.attendance.count()} absences/retards`)
  console.log(`   - ${await db.timetableSession.count()} créneaux d'emploi du temps`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

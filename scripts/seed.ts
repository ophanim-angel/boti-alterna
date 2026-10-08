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

  // ================= STUDENTS + GUARDIANS =================
  console.log('🎒 Élèves & familles...')
  const studentsData: Array<{
    first: string; last: string; gender: string; klass: string; birth: string;
    parents: number[]; status?: string;
  }> = [
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

    // Payments: Septembre -> Février
    const months = [
      { m: 9, label: 'Septembre 2025', due: '2025-09-10' },
      { m: 10, label: 'Octobre 2025', due: '2025-10-10' },
      { m: 11, label: 'Novembre 2025', due: '2025-11-10' },
      { m: 12, label: 'Décembre 2025', due: '2025-12-10' },
      { m: 1, label: 'Janvier 2026', due: '2026-01-10' },
      { m: 2, label: 'Février 2026', due: '2026-02-10' },
    ]
    for (const mo of months) {
      const r = (matricule + mo.m) % 7
      let status = 'EN_ATTENTE'
      let paidDate: Date | null = null
      let method: string | null = null
      if (r <= 3) {
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
  const p1 = await db.period.findFirst({ where: { order: 1 } })
  const p2 = await db.period.findFirst({ where: { order: 2 } })
  const evalData = [
    { klass: 'CP - A', subject: 'Français', teacher: 0, period: p1, title: 'Contrôle n°1 — Lecture', type: 'CONTROLE', date: '2025-10-14', max: 20 },
    { klass: 'CP - A', subject: 'Français', teacher: 0, period: p1, title: 'Contrôle n°2 — Écriture', type: 'CONTROLE', date: '2025-11-12', max: 20 },
    { klass: 'CP - A', subject: 'Mathématiques', teacher: 1, period: p1, title: 'Contrôle n°1 — Numération', type: 'CONTROLE', date: '2025-10-16', max: 20 },
    { klass: 'CE1 - A', subject: 'Français', teacher: 1, period: p1, title: 'Contrôle n°1 — Grammaire', type: 'CONTROLE', date: '2025-10-15', max: 20 },
    { klass: 'CE1 - A', subject: 'Mathématiques', teacher: 0, period: p1, title: 'Examen 1er Trimestre', type: 'EXAMEN', date: '2025-11-25', max: 20 },
    { klass: 'CE2 - A', subject: 'Éveil Scientifique', teacher: 3, period: p1, title: 'Contrôle — Les êtres vivants', type: 'CONTROLE', date: '2025-10-20', max: 20 },
    { klass: 'CM2 - A', subject: 'Mathématiques', teacher: 3, period: p1, title: 'Examen 1er Trimestre', type: 'EXAMEN', date: '2025-11-26', max: 20 },
    { klass: 'CM2 - A', subject: 'Français', teacher: 1, period: p1, title: 'Contrôle n°2 — Conjugaison', type: 'CONTROLE', date: '2025-11-10', max: 20 },
    { klass: '1AC - A', subject: 'Mathématiques', teacher: 0, period: p1, title: 'Examen 1er Trimestre', type: 'EXAMEN', date: '2025-11-27', max: 20 },
    { klass: 'GS - A', subject: 'Français', teacher: 2, period: p2, title: 'Évaluation — Reconnaissance des lettres', type: 'CONTROLE', date: '2026-02-10', max: 10 },
    { klass: 'CP - A', subject: 'Mathématiques', teacher: 1, period: p2, title: 'Contrôle n°1 — Calcul', type: 'CONTROLE', date: '2026-02-12', max: 20 },
    { klass: 'CE1 - A', subject: 'Français', teacher: 1, period: p2, title: 'Contrôle n°1 — Orthographe', type: 'CONTROLE', date: '2026-02-13', max: 20 },
    { klass: 'CM2 - A', subject: 'Mathématiques', teacher: 3, period: p2, title: 'Contrôle n°1 — Fractions', type: 'CONTROLE', date: '2026-02-14', max: 20 },
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
      audience: 'PARENTS', pinned: true, author: admin,
    },
    {
      title: 'Sortie pédagogique au Musée Mohammed VI',
      content:
        "Les élèves de CE1, CE2 et CM1 bénéficieront d'une sortie pédagogique au Musée Mohammed VI des civilisations le jeudi 5 mars. Le transport est assuré par l'école. Merci de retourner l'autorisation signée avant le mardi 3 mars.",
      audience: 'TOUS', pinned: false, author: admin,
    },
    {
      title: 'Journée portes ouvertes — Inscriptions 2026/2027',
      content:
        "L'école organise sa journée portes ouvertes le dimanche 15 mars de 10h à 17h. Invitez vos proches à venir découvrir nos locaux, rencontrer l'équipe pédagogique et s'informer sur le processus d'inscription pour l'année scolaire 2026/2027.",
      audience: 'TOUS', pinned: false, author: admin,
    },
    {
      title: 'Conseil pédagogique — Validation des évaluations',
      content:
        "Chers collègues, merci de saisir toutes les notes du 2ème trimestre dans la plateforme avant le vendredi 28 février à 18h. Le conseil pédagogique se réunira le lundi 2 mars pour valider les évaluations.",
      audience: 'ENSEIGNANTS', pinned: false, author: admin,
    },
    {
      title: "Kermesse de fin d'année — Appel aux bénévoles",
      content:
        "La kermesse annuelle se tiendra le samedi 30 mai. Les parents volontaires pour tenir des stands (gastronomie, jeux, brocante) sont invités à se manifester auprès de l'association des parents d'élèves.",
      audience: 'PARENTS', pinned: false, author: teachers[2],
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

  // ================= ATTENDANCE =================
  console.log('🚫 Absences & retards...')
  const attendanceTypes = ['ABSENCE', 'RETARD']
  const reasons = ['Maladie', 'Rendez-vous médical', 'Raison familiale', 'Trafic', null, null]
  for (const st of students.slice(0, 18)) {
    const n = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < n; i++) {
      const type = attendanceTypes[Math.floor(Math.random() * 2)]
      const reason = reasons[Math.floor(Math.random() * reasons.length)]
      await db.attendance.create({
        data: {
          studentId: st.id,
          date: d(`2026-02-${String(3 + Math.floor(Math.random() * 18)).padStart(2, '0')}`),
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
  const sampleClasses = ['CP - A', 'CE1 - A', 'CM2 - A', '1AC - A']
  for (const k of sampleClasses) {
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
  console.log(`   - ${await db.user.count()} utilisateurs`)
  console.log(`   - ${await db.student.count()} élèves`)
  console.log(`   - ${await db.class.count()} classes`)
  console.log(`   - ${await db.payment.count()} paiements`)
  console.log(`   - ${await db.grade.count()} notes`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

import { fileURLToPath } from 'node:url';
import argon2 from 'argon2';
import { eq, and, sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db, pool } from './pool.js';
import { users } from './schema/users.js';
import { schools } from './schema/schools.js';
import { boards } from './schema/boards.js';
import { grades } from './schema/grades.js';
import { subjects, gradeSubjects } from './schema/subjects.js';
import { teachers } from './schema/teachers.js';
import { students } from './schema/students.js';
import { teacherAssignments } from './schema/teacher-assignments.js';
import { principals } from './schema/principals.js';
import { logger } from '../lib/logger.js';
import { ARGON2_MEMORY_COST, ARGON2_TIME_COST, ARGON2_PARALLELISM } from '../config/constants.js';

async function getOrInsertSchool(data: typeof schools.$inferInsert) {
  const [existing] = await db
    .select()
    .from(schools)
    .where(sql`lower(${schools.code}) = lower(${data.code})`)
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(schools).values(data).returning();
  if (!created) {
    throw new Error(`Failed to insert school: ${data.code}`);
  }
  return created;
}

async function getOrInsertUser(data: typeof users.$inferInsert) {
  const [existing] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = lower(${data.email})`)
    .limit(1);

  if (existing) {
    if (data.schoolId && !existing.schoolId) {
      await db.update(users).set({ schoolId: data.schoolId }).where(eq(users.id, existing.id));
      existing.schoolId = data.schoolId;
    }
    return existing;
  }

  const [created] = await db.insert(users).values(data).returning();
  if (!created) {
    throw new Error(`Failed to insert user: ${data.email}`);
  }
  return created;
}

async function getOrInsertBoard(data: typeof boards.$inferInsert) {
  const [existing] = await db
    .select()
    .from(boards)
    .where(
      and(eq(boards.schoolId, data.schoolId), sql`lower(${boards.code}) = lower(${data.code})`),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(boards).values(data).returning();
  if (!created) {
    throw new Error(`Failed to insert board: ${data.code}`);
  }
  return created;
}

async function getOrInsertGrade(data: typeof grades.$inferInsert) {
  const [existing] = await db
    .select()
    .from(grades)
    .where(
      and(
        eq(grades.boardId, data.boardId),
        eq(grades.gradeNumber, data.gradeNumber),
        data.section ? eq(grades.section, data.section) : sql`${grades.section} is null`,
      ),
    )
    .limit(1);

  if (existing) {
    if (data.classTeacherId && existing.classTeacherId !== data.classTeacherId) {
      await db
        .update(grades)
        .set({ classTeacherId: data.classTeacherId })
        .where(eq(grades.id, existing.id));
      existing.classTeacherId = data.classTeacherId;
    }
    return existing;
  }

  const [created] = await db.insert(grades).values(data).returning();
  if (!created) {
    throw new Error(`Failed to insert grade: ${data.code}`);
  }
  return created;
}

async function getOrInsertSubject(data: typeof subjects.$inferInsert) {
  const [existing] = await db
    .select()
    .from(subjects)
    .where(
      and(eq(subjects.schoolId, data.schoolId), sql`lower(${subjects.code}) = lower(${data.code})`),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(subjects).values(data).returning();
  if (!created) {
    throw new Error(`Failed to insert subject: ${data.code}`);
  }
  return created;
}

async function getOrInsertGradeSubject(data: typeof gradeSubjects.$inferInsert) {
  const [existing] = await db
    .select()
    .from(gradeSubjects)
    .where(
      and(eq(gradeSubjects.gradeId, data.gradeId), eq(gradeSubjects.subjectId, data.subjectId)),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(gradeSubjects).values(data).returning();
  if (!created) {
    throw new Error(`Failed to insert grade_subject link for grade ${data.gradeId}`);
  }
  return created;
}

async function getOrInsertTeacher(data: typeof teachers.$inferInsert) {
  const [existing] = await db
    .select()
    .from(teachers)
    .where(
      and(
        eq(teachers.schoolId, data.schoolId),
        sql`lower(${teachers.employeeId}) = lower(${data.employeeId})`,
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(teachers).values(data).returning();
  if (!created) {
    throw new Error(`Failed to insert teacher: ${data.employeeId}`);
  }
  return created;
}

async function getOrInsertPrincipal(data: typeof principals.$inferInsert) {
  const [existing] = await db
    .select()
    .from(principals)
    .where(eq(principals.schoolId, data.schoolId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(principals).values(data).returning();
  if (!created) {
    throw new Error(`Failed to insert principal for school: ${data.schoolId}`);
  }
  return created;
}

async function getOrInsertTeacherAssignment(data: typeof teacherAssignments.$inferInsert) {
  const [existing] = await db
    .select()
    .from(teacherAssignments)
    .where(
      and(
        eq(teacherAssignments.teacherId, data.teacherId),
        eq(teacherAssignments.gradeId, data.gradeId),
        eq(teacherAssignments.subjectId, data.subjectId),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(teacherAssignments).values(data).returning();
  if (!created) {
    throw new Error(
      `Failed to insert teacher assignment: ${data.teacherId}-${data.gradeId}-${data.subjectId}`,
    );
  }
  return created;
}

async function getOrInsertStudent(data: typeof students.$inferInsert) {
  const [existing] = await db
    .select()
    .from(students)
    .where(
      and(
        eq(students.schoolId, data.schoolId),
        sql`lower(${students.admissionNumber}) = lower(${data.admissionNumber})`,
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(students).values(data).returning();
  if (!created) {
    throw new Error(`Failed to insert student: ${data.admissionNumber}`);
  }
  return created;
}

export async function seedDatabase(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    logger.error('Refusing to seed database in production environment');
    throw new Error('Cannot seed database in production');
  }

  logger.info('Seeding development database...');

  const defaultPassword = 'Password123!@#';
  const passwordHash = await argon2.hash(defaultPassword, {
    memoryCost: ARGON2_MEMORY_COST,
    timeCost: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
  });

  // 1. Super Admin user (school-agnostic, schoolId = null)
  logger.info('Seeding super admin user...');
  await getOrInsertUser({
    email: 'superadmin@learning-matters.com',
    passwordHash,
    role: 'super_admin',
    schoolId: null,
    firstName: 'Super',
    lastName: 'Admin',
    status: 'active',
    isActive: true,
  });

  // 2. Schools
  logger.info('Seeding schools...');
  const abcSchool = await getOrInsertSchool({
    name: 'ABC International School',
    code: 'ABC001',
    address: '123 Education Lane, Connaught Place',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    phone: '+91-11-23456789',
    email: 'info@abcschool.edu',
    website: 'https://abcschool.edu',
    status: 'active',
  });

  await getOrInsertSchool({
    name: 'Delhi Public School',
    code: 'DPS001',
    address: '456 Knowledge Park, Sector 12',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    phone: '+91-11-98765432',
    email: 'info@dps001.edu',
    website: 'https://dps001.edu',
    status: 'active',
  });

  // 3. School Admin user
  logger.info('Seeding school admin user...');
  const adminUser = await getOrInsertUser({
    email: 'admin@abcschool.edu',
    passwordHash,
    role: 'admin',
    schoolId: abcSchool.id,
    firstName: 'School',
    lastName: 'Admin',
    status: 'active',
    isActive: true,
  });

  // Also ensure legacy/placeholder admin is seeded/updated
  await getOrInsertUser({
    email: 'admin@learning-matters.com',
    passwordHash,
    role: 'admin',
    schoolId: abcSchool.id,
    firstName: 'System',
    lastName: 'Admin',
    status: 'active',
    isActive: true,
  });

  // 4. Principal User and Profile
  logger.info('Seeding principal user and profile...');
  const principalUser = await getOrInsertUser({
    email: 'principal@abcschool.edu',
    passwordHash,
    role: 'principal',
    schoolId: abcSchool.id,
    firstName: 'Arthur',
    lastName: 'Pendelton',
    phone: '+91-9876543210',
    status: 'active',
    isActive: true,
  });

  await getOrInsertPrincipal({
    schoolId: abcSchool.id,
    userId: principalUser.id,
    employeeId: 'PRIN-001',
    firstName: 'Arthur',
    lastName: 'Pendelton',
    email: 'principal@abcschool.edu',
    phone: '+91-9876543210',
    status: 'active',
  });

  // 5. Boards under ABC International School
  logger.info('Seeding boards...');
  const cbseBoard = await getOrInsertBoard({
    schoolId: abcSchool.id,
    name: 'Central Board of Secondary Education',
    code: 'CBSE',
    description: 'National curriculum board of India',
    status: 'active',
  });

  await getOrInsertBoard({
    schoolId: abcSchool.id,
    name: 'Indian Certificate of Secondary Education',
    code: 'ICSE',
    description: 'Council for the Indian School Certificate Examinations',
    status: 'active',
  });

  // 6. Master Subjects under ABC International School (10 subjects)
  logger.info('Seeding master subjects...');
  const subjectDefinitions = [
    { code: 'MATH', name: 'Mathematics', description: 'Mathematics curriculum' },
    { code: 'ENG', name: 'English', description: 'English language and literature' },
    { code: 'SCI', name: 'Science', description: 'General Science' },
    { code: 'SST', name: 'Social Studies', description: 'History, Civics and Geography' },
    { code: 'HIN', name: 'Hindi', description: 'Hindi language and literature' },
    { code: 'CS', name: 'Computer Science', description: 'Computing and Programming' },
    { code: 'ART', name: 'Art', description: 'Visual and Creative Arts' },
    { code: 'PE', name: 'Physical Education', description: 'Health and Physical Education' },
    { code: 'MUS', name: 'Music', description: 'Vocal and Instrumental Music' },
    { code: 'EVS', name: 'Environmental Studies', description: 'Environmental Science' },
  ];

  const subjectMap = new Map<string, typeof subjects.$inferSelect>();
  for (const s of subjectDefinitions) {
    const createdSubject = await getOrInsertSubject({
      schoolId: abcSchool.id,
      name: s.name,
      code: s.code,
      description: s.description,
      status: 'active',
    });
    subjectMap.set(s.code, createdSubject);
  }

  // 7. Teacher Users & Profiles (3 teachers)
  logger.info('Seeding teachers...');
  const teacherUsersData = [
    {
      employeeId: 'EMP-T01',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@abcschool.edu',
      phone: '+91-9876500001',
      qualification: 'M.Sc. Mathematics, B.Ed.',
      joiningDate: new Date('2022-06-01T00:00:00.000Z'),
    },
    {
      employeeId: 'EMP-T02',
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah.connor@abcschool.edu',
      phone: '+91-9876500002',
      qualification: 'M.A. English Literature, B.Ed.',
      joiningDate: new Date('2021-08-15T00:00:00.000Z'),
    },
    {
      employeeId: 'EMP-T03',
      firstName: 'David',
      lastName: 'Miller',
      email: 'david.miller@abcschool.edu',
      phone: '+91-9876500003',
      qualification: 'M.Sc. Physics, B.Ed.',
      joiningDate: new Date('2023-01-10T00:00:00.000Z'),
    },
  ];

  const teacherMap = new Map<string, typeof teachers.$inferSelect>();
  for (const t of teacherUsersData) {
    const tUser = await getOrInsertUser({
      email: t.email,
      passwordHash,
      role: 'teacher',
      schoolId: abcSchool.id,
      firstName: t.firstName,
      lastName: t.lastName,
      phone: t.phone,
      status: 'active',
      isActive: true,
    });

    const teacher = await getOrInsertTeacher({
      schoolId: abcSchool.id,
      userId: tUser.id,
      employeeId: t.employeeId,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: t.phone,
      qualification: t.qualification,
      joiningDate: t.joiningDate,
      status: 'active',
    });
    teacherMap.set(t.employeeId, teacher);
  }

  // 8. Grades under CBSE (6 grades)
  logger.info('Seeding grades and assigning class teachers...');
  const johnDoe = teacherMap.get('EMP-T01');
  const davidMiller = teacherMap.get('EMP-T03');
  const sarahConnor = teacherMap.get('EMP-T02');

  if (!johnDoe || !davidMiller || !sarahConnor) {
    throw new Error('Required teachers not found in map');
  }

  await getOrInsertGrade({
    schoolId: abcSchool.id,
    boardId: cbseBoard.id,
    name: 'Grade 1',
    code: 'G1',
    gradeNumber: 1,
    section: null,
    capacity: 40,
    status: 'active',
  });

  await getOrInsertGrade({
    schoolId: abcSchool.id,
    boardId: cbseBoard.id,
    name: 'Grade 2 - Section A',
    code: 'G2-A',
    gradeNumber: 2,
    section: 'A',
    capacity: 35,
    status: 'active',
  });

  await getOrInsertGrade({
    schoolId: abcSchool.id,
    boardId: cbseBoard.id,
    name: 'Grade 2 - Section B',
    code: 'G2-B',
    gradeNumber: 2,
    section: 'B',
    capacity: 35,
    status: 'active',
  });

  await getOrInsertGrade({
    schoolId: abcSchool.id,
    boardId: cbseBoard.id,
    name: 'Grade 3',
    code: 'G3',
    gradeNumber: 3,
    section: null,
    capacity: 40,
    status: 'active',
  });

  // Grade 5-A with John Doe as Class Teacher
  const grade5A = await getOrInsertGrade({
    schoolId: abcSchool.id,
    boardId: cbseBoard.id,
    name: 'Grade 5 - Section A',
    code: 'G5-A',
    gradeNumber: 5,
    section: 'A',
    capacity: 35,
    classTeacherId: johnDoe.id,
    status: 'active',
  });

  // Grade 6-A with David Miller as Class Teacher
  const grade6A = await getOrInsertGrade({
    schoolId: abcSchool.id,
    boardId: cbseBoard.id,
    name: 'Grade 6 - Section A',
    code: 'G6-A',
    gradeNumber: 6,
    section: 'A',
    capacity: 35,
    classTeacherId: davidMiller.id,
    status: 'active',
  });

  // 9. Grade-Subject links for Grade 5-A and Grade 6-A
  logger.info('Linking subjects to grades...');
  const gradeSubjectCodes = ['MATH', 'ENG', 'SCI', 'SST', 'HIN', 'CS', 'PE'];
  for (const grade of [grade5A, grade6A]) {
    for (const code of gradeSubjectCodes) {
      const subject = subjectMap.get(code);
      if (subject) {
        await getOrInsertGradeSubject({
          schoolId: abcSchool.id,
          gradeId: grade.id,
          subjectId: subject.id,
          status: 'active',
        });
      }
    }
  }

  // 10. Teacher Assignments
  logger.info('Assigning teachers to grades and subjects...');
  const mathSubject = subjectMap.get('MATH');
  const englishSubject = subjectMap.get('ENG');
  const scienceSubject = subjectMap.get('SCI');

  if (!mathSubject || !englishSubject || !scienceSubject) {
    throw new Error('Required subjects for teacher assignment not found in map');
  }

  const assignments = [
    { teacher: johnDoe, grade: grade5A, subject: mathSubject },
    { teacher: johnDoe, grade: grade6A, subject: mathSubject },
    { teacher: sarahConnor, grade: grade5A, subject: englishSubject },
    { teacher: sarahConnor, grade: grade6A, subject: englishSubject },
    { teacher: davidMiller, grade: grade5A, subject: scienceSubject },
    { teacher: davidMiller, grade: grade6A, subject: scienceSubject },
  ];

  for (const a of assignments) {
    await getOrInsertTeacherAssignment({
      schoolId: abcSchool.id,
      teacherId: a.teacher.id,
      gradeId: a.grade.id,
      subjectId: a.subject.id,
      assignedBy: adminUser.id,
      status: 'active',
      effectiveDate: new Date('2024-04-01T00:00:00.000Z'),
    });
  }

  // 11. Students (8 realistic students: 4 in Grade 5-A, 4 in Grade 6-A)
  logger.info('Seeding students...');
  const studentData: (typeof students.$inferInsert)[] = [
    {
      schoolId: abcSchool.id,
      boardId: cbseBoard.id,
      gradeId: grade5A.id,
      admissionNumber: 'ADM-G5A-01',
      firstName: 'Aarav',
      lastName: 'Sharma',
      dateOfBirth: new Date('2014-04-12T00:00:00.000Z'),
      gender: 'male',
      guardianName: 'Rajesh Sharma',
      guardianPhone: '+91-9811100001',
      guardianEmail: 'rajesh.sharma@example.com',
      address: 'B-12 Preet Vihar, New Delhi',
      status: 'active',
    },
    {
      schoolId: abcSchool.id,
      boardId: cbseBoard.id,
      gradeId: grade5A.id,
      admissionNumber: 'ADM-G5A-02',
      firstName: 'Ananya',
      lastName: 'Patel',
      dateOfBirth: new Date('2014-08-25T00:00:00.000Z'),
      gender: 'female',
      guardianName: 'Sanjay Patel',
      guardianPhone: '+91-9811100002',
      guardianEmail: 'sanjay.patel@example.com',
      address: 'C-45 Saket, New Delhi',
      status: 'active',
    },
    {
      schoolId: abcSchool.id,
      boardId: cbseBoard.id,
      gradeId: grade5A.id,
      admissionNumber: 'ADM-G5A-03',
      firstName: 'Rohan',
      lastName: 'Gupta',
      dateOfBirth: new Date('2014-02-18T00:00:00.000Z'),
      gender: 'male',
      guardianName: 'Vikas Gupta',
      guardianPhone: '+91-9811100003',
      guardianEmail: 'vikas.gupta@example.com',
      address: 'Flat 302 Mayur Vihar, New Delhi',
      status: 'active',
    },
    {
      schoolId: abcSchool.id,
      boardId: cbseBoard.id,
      gradeId: grade5A.id,
      admissionNumber: 'ADM-G5A-04',
      firstName: 'Diya',
      lastName: 'Verma',
      dateOfBirth: new Date('2014-11-05T00:00:00.000Z'),
      gender: 'female',
      guardianName: 'Sunil Verma',
      guardianPhone: '+91-9811100004',
      guardianEmail: 'sunil.verma@example.com',
      address: 'D-8 Lajpat Nagar, New Delhi',
      status: 'active',
    },
    {
      schoolId: abcSchool.id,
      boardId: cbseBoard.id,
      gradeId: grade6A.id,
      admissionNumber: 'ADM-G6A-01',
      firstName: 'Kabir',
      lastName: 'Mehta',
      dateOfBirth: new Date('2013-05-14T00:00:00.000Z'),
      gender: 'male',
      guardianName: 'Anil Mehta',
      guardianPhone: '+91-9811100005',
      guardianEmail: 'anil.mehta@example.com',
      address: 'E-21 Hauz Khas, New Delhi',
      status: 'active',
    },
    {
      schoolId: abcSchool.id,
      boardId: cbseBoard.id,
      gradeId: grade6A.id,
      admissionNumber: 'ADM-G6A-02',
      firstName: 'Ishita',
      lastName: 'Reddy',
      dateOfBirth: new Date('2013-09-30T00:00:00.000Z'),
      gender: 'female',
      guardianName: 'Kiran Reddy',
      guardianPhone: '+91-9811100006',
      guardianEmail: 'kiran.reddy@example.com',
      address: 'A-77 Vasant Kunj, New Delhi',
      status: 'active',
    },
    {
      schoolId: abcSchool.id,
      boardId: cbseBoard.id,
      gradeId: grade6A.id,
      admissionNumber: 'ADM-G6A-03',
      firstName: 'Vihaan',
      lastName: 'Malhotra',
      dateOfBirth: new Date('2013-03-22T00:00:00.000Z'),
      gender: 'male',
      guardianName: 'Raman Malhotra',
      guardianPhone: '+91-9811100007',
      guardianEmail: 'raman.malhotra@example.com',
      address: 'H-10 Greater Kailash, New Delhi',
      status: 'active',
    },
    {
      schoolId: abcSchool.id,
      boardId: cbseBoard.id,
      gradeId: grade6A.id,
      admissionNumber: 'ADM-G6A-04',
      firstName: 'Meera',
      lastName: 'Iyer',
      dateOfBirth: new Date('2013-12-19T00:00:00.000Z'),
      gender: 'female',
      guardianName: 'Venkat Iyer',
      guardianPhone: '+91-9811100008',
      guardianEmail: 'venkat.iyer@example.com',
      address: 'M-15 Dwarka Sector 6, New Delhi',
      status: 'active',
    },
  ];

  for (const student of studentData) {
    await getOrInsertStudent(student);
  }

  logger.info('Database seeding completed successfully');
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1]?.toLowerCase() === currentFilePath.toLowerCase()) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err: unknown) => {
      logger.fatal({ err }, 'Seed execution failed');
      await pool.end();
      process.exit(1);
    });
}

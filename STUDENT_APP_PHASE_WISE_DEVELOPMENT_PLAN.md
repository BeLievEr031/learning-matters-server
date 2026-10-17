# Student Mobile / Web App — Phase-Wise API Development Plan

> **Document Version:** 1.0.0  
> **Target Subsystem:** Server (`server/src/modules/students`, `server/src/modules/auth`, `server/src/modules/chapters`)  
> **Tech Stack:** Node.js 22 · Express 5 · TypeScript · Drizzle ORM · PostgreSQL · Zod · Argon2 · JWT · Vitest  

---

## 1. Executive Summary & Objective

This document outlines the phased backend engineering plan to support the new **Student App**. It extends the current student and curriculum infrastructure to enable:

1. **Student Authentication & Session Context (`User login`):** Seamless login with auto-provisioned student user accounts and complete profile context (school, board, grade, section).
2. **Grade-Scoped Subject Discovery (`Assigned Grade's Subjects Only`):** Strict data isolation ensuring students can only discover and access subjects assigned to their specific grade.
3. **Chapter Hierarchy Exploration (`Subject -> Chapters`):** Structured syllabus exploration showing active chapters ordered by sequence number with resource counters.
4. **Daily Uploaded Learning Materials (`Daily Material Timeline`):** Access to daily uploaded documents, presentations, worksheets, and video links with date-based filtering and across-subject daily feeds.

---

## 2. Current Architecture vs. Target State Analysis

### 2.1 Current Gaps

| Feature Area | Current State | Target State for Student App |
|---|---|---|
| **Student Auth** | `students` table has nullable `userId`. Creating a student leaves `userId: null` unless manually supplied. No default password provisioning. | Auto-provision a `users` record with role `student`, default initial password (`Student@123`), and provide `GET /api/v1/students/me`. |
| **Subject Access** | `GET /grades/:gradeId/subjects` exists but is restricted to staff (`super_admin`, `admin`, `principal`, `class_teacher`, `teacher`). Student cannot fetch subjects. | Dedicated `GET /api/v1/students/me/subjects` returning only subjects assigned to the logged-in student's grade, complete with teacher info and chapter counts. |
| **Chapter Access** | `GET /subjects/:subjectId/chapters` requires manual `subjectId` and doesn't verify if that subject belongs to the student's enrolled grade. | Secure endpoint `GET /api/v1/students/me/subjects/:subjectId/chapters` validating student's grade enrollment before serving chapters. |
| **Daily Materials** | `chapterMaterialsRouter.get('/:chapterId/materials')` lists all materials without date-based filtering or daily timeline grouping. | Query support for `?date=YYYY-MM-DD` on `GET /api/v1/students/me/chapters/:chapterId/materials`, plus a daily feed `GET /api/v1/students/me/materials/daily` across all subjects. |

---

## 3. Data Flow & Security Model

```
[Student Client App]
         │
         │ 1. POST /api/v1/auth/login { email, password }
         ▼
[Auth Service & JWT Token]
   (sub: userId, role: 'student', schoolId: schoolId)
         │
         │ 2. GET /api/v1/students/me
         ▼
[Students Service -> findByUserId(req.user.id)]
   => Resolves studentId, schoolId, boardId, and assigned gradeId
         │
         ├─► 3. GET /api/v1/students/me/subjects
         │      Filters `grade_subjects` WHERE grade_id = student.gradeId
         │
         ├─► 4. GET /api/v1/students/me/subjects/:subjectId/chapters
         │      Verifies subjectId in student.gradeId -> Returns sorted chapters
         │
         └─► 5. GET /api/v1/students/me/chapters/:chapterId/materials?date=YYYY-MM-DD
                Verifies chapter belongs to student's grade -> Returns daily uploads
```

---

## 4. Phase-Wise Implementation Roadmap

---

### Phase 1: Student Account Provisioning & Authentication Context

#### 1.1 Objectives
- Allow students to authenticate using the standard `/api/v1/auth/login` flow.
- Automatically create a `users` record with `role: 'student'` and a default hashed password (`Student@123` via `DEFAULT_STUDENT_PASSWORD`) when a student is created by an admin (mirroring the teacher auto-provisioning pattern).
- Provide `GET /api/v1/students/me` to fetch current student profile, grade details, section, board, and school.

#### 1.2 Files to Modify / Create
- `server/src/config/constants.ts`: Add `DEFAULT_STUDENT_PASSWORD`.
- `server/src/modules/students/students.repository.ts`:
  - Add `findByUserId(userId: string, includeDeleted?: boolean): Promise<Student | null>`.
  - Add `findProfileByUserId(userId: string): Promise<StudentProfileResult | null>`.
- `server/src/modules/students/students.service.ts`:
  - Update `createStudent()`: wrap in transaction (`txRunner`), hash default password, auto-create user with `role: 'student'` if `userId` is omitted and `email` is present.
  - Add `getMyProfile(callerUserId: string)`.
- `server/src/modules/students/students.controller.ts`:
  - Add `getMe(req, res)`.
- `server/src/modules/students/students.routes.ts`:
  - Register `studentsRouter.get('/me', authenticate, authorize('student'), studentsController.getMe)`.

#### 1.3 Target Endpoint & Response
`GET /api/v1/students/me`
```json
{
  "data": {
    "studentId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "schoolId": "789e0123-e89b-12d3-a456-426614174000",
    "schoolName": "Greenwood International School",
    "boardId": "456e7890-e89b-12d3-a456-426614174000",
    "boardName": "CBSE",
    "gradeId": "987e6543-e89b-12d3-a456-426614174000",
    "gradeName": "Grade 10 - Section A",
    "gradeNumber": 10,
    "section": "A",
    "admissionNumber": "ADM-2026-0042",
    "firstName": "Alex",
    "lastName": "Johnson",
    "email": "alex.johnson@school.edu",
    "phone": "+919876543210",
    "gender": "male",
    "status": "active"
  }
}
```

#### 1.4 Git Commit Message
```text
feat(students): auto-provision student user accounts and add /students/me profile endpoint

- Add DEFAULT_STUDENT_PASSWORD constant to configuration
- Update StudentsService.createStudent to transactionally provision users record with role 'student'
- Add findByUserId and findProfileByUserId to StudentsRepository
- Add GET /api/v1/students/me endpoint for student self-profile retrieval
```

---

### Phase 2: Grade-Scoped Subject Discovery

#### 2.1 Objectives
- Allow the authenticated student to retrieve ONLY the subjects assigned to their enrolled grade (`grade_subjects` join `subjects`).
- Prevent any data leakage between grades (students of Grade 9 cannot see Grade 10 subjects).
- Include enriched metadata: assigned teacher name, subject code, total active chapters, and total material count.

#### 2.2 Files to Modify / Create
- `server/src/modules/students/students.repository.ts`:
  - Add `findAssignedSubjectsByGradeId(gradeId: string, schoolId: string): Promise<StudentSubjectResult[]>`.
  - Performs an inner join between `grade_subjects` and `subjects`, with subqueries/joins for chapter count and material count.
- `server/src/modules/students/students.service.ts`:
  - Add `getMyAssignedSubjects(callerUserId: string): Promise<StudentSubjectResult[]>`.
  - Resolves `student` record by `callerUserId`, verifies active student status, and queries assigned subjects for `student.gradeId`.
- `server/src/modules/students/students.controller.ts`:
  - Add `getMyAssignedSubjects(req, res)`.
- `server/src/modules/students/students.routes.ts`:
  - Register `studentsRouter.get('/me/subjects', authenticate, authorize('student'), studentsController.getMyAssignedSubjects)`.
- `server/src/modules/subjects/subjects.routes.ts`:
  - Update `gradeSubjectsRouter.get('/')` RBAC: add `'student'` to authorize list with middleware guard ensuring `req.params.gradeId === student.gradeId`.

#### 2.3 Target Endpoint & Response
`GET /api/v1/students/me/subjects`
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Mathematics",
      "code": "MATH-10",
      "description": "Standard Mathematics for Grade 10",
      "status": "active",
      "totalChapters": 14,
      "totalMaterials": 48,
      "teachers": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440000",
          "name": "Dr. Sarah Smith"
        }
      ]
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Physics",
      "code": "PHY-10",
      "description": "Foundations of Physics",
      "status": "active",
      "totalChapters": 10,
      "totalMaterials": 32,
      "teachers": [
        {
          "id": "880e8400-e29b-41d4-a716-446655440000",
          "name": "Prof. David Miller"
        }
      ]
    }
  ]
}
```

#### 2.4 Git Commit Message
```text
feat(students): implement scoped subject listing for student assigned grade

- Add findAssignedSubjectsByGradeId to StudentsRepository with chapter/material counts
- Implement getMyAssignedSubjects in StudentsService validating student grade enrollment
- Register GET /api/v1/students/me/subjects with student authorization
- Add student grade ownership guard to standard grade subjects route
```

---

### Phase 3: Subject Chapter Hierarchy & Syllabus Viewer

#### 3.1 Objectives
- Allow the student to select a subject and inspect its structured chapters.
- Ensure security: verify that the requested `subjectId` is actually mapped to the student's assigned grade.
- Return chapters ordered sequentially (`chapter_number ASC`).
- Return chapter summary counters (`totalMaterials`, `totalNotes`, `lastUploadedAt`).

#### 3.2 Files to Modify / Create
- `server/src/modules/students/students.schemas.ts`:
  - Add `studentSubjectParamSchema`: validates UUID `:subjectId`.
  - Add `studentChapterParamSchema`: validates UUID `:chapterId`.
- `server/src/modules/students/students.repository.ts`:
  - Add `findChaptersBySubjectForGrade(gradeId: string, subjectId: string): Promise<StudentChapterResult[]>`.
  - Add `findChapterDetailsForStudent(gradeId: string, chapterId: string): Promise<StudentChapterDetailResult | null>`.
- `server/src/modules/students/students.service.ts`:
  - Add `getMySubjectChapters(callerUserId: string, subjectId: string): Promise<StudentChapterResult[]>`.
  - Validates that `subjectId` belongs to `student.gradeId` via `grade_subjects`; throws `ForbiddenError` otherwise.
  - Add `getMyChapterDetails(callerUserId: string, chapterId: string)`.
- `server/src/modules/students/students.controller.ts`:
  - Add `getMySubjectChapters(req, res)`.
  - Add `getMyChapterDetails(req, res)`.
- `server/src/modules/students/students.routes.ts`:
  - Register `studentsRouter.get('/me/subjects/:subjectId/chapters', authenticate, authorize('student'), validate({ params: studentSubjectParamSchema }), studentsController.getMySubjectChapters)`.
  - Register `studentsRouter.get('/me/chapters/:chapterId', authenticate, authorize('student'), validate({ params: studentChapterParamSchema }), studentsController.getMyChapterDetails)`.

#### 3.3 Target Endpoint & Response
`GET /api/v1/students/me/subjects/550e8400-e29b-41d4-a716-446655440000/chapters`
```json
{
  "data": [
    {
      "id": "111e8400-e29b-41d4-a716-446655440001",
      "chapterNumber": 1,
      "title": "Real Numbers",
      "description": "Euclid division lemma and fundamental theorem of arithmetic",
      "status": "active",
      "totalMaterials": 5,
      "totalNotes": 2,
      "lastMaterialUploadedAt": "2026-10-15T14:30:00.000Z"
    },
    {
      "id": "111e8400-e29b-41d4-a716-446655440002",
      "chapterNumber": 2,
      "title": "Polynomials",
      "description": "Geometrical meaning of the zeroes of a polynomial",
      "status": "active",
      "totalMaterials": 8,
      "totalNotes": 3,
      "lastMaterialUploadedAt": "2026-10-14T09:15:00.000Z"
    }
  ]
}
```

#### 3.4 Git Commit Message
```text
feat(students): add grade-scoped chapter navigation for assigned subjects

- Add studentSubjectParamSchema and studentChapterParamSchema in students.schemas
- Add findChaptersBySubjectForGrade and chapter verification to StudentsRepository
- Implement getMySubjectChapters with grade-subject boundary validation
- Expose GET /api/v1/students/me/subjects/:subjectId/chapters and /me/chapters/:chapterId
```

---

### Phase 4: Daily Uploaded Materials & Learning Resources

#### 4.1 Objectives
- Allow students to open any chapter and view materials uploaded by their teachers (`document`, `worksheet`, `presentation`, `video_link`, `reference_link`).
- Support date filtering (`?date=YYYY-MM-DD`) to check daily uploaded resources.
- Support sorting in reverse chronological order (`createdAt DESC`) so daily homework/materials are at the top.
- Provide a Daily Feed endpoint (`GET /api/v1/students/me/materials/daily?date=YYYY-MM-DD`) that aggregates all materials uploaded on that date across all enrolled subjects for the student app dashboard.

#### 4.2 Files to Modify / Create
- `server/src/modules/students/students.schemas.ts`:
  - Add `listStudentMaterialsQuerySchema`:
    - `date`: optional regex `^\d{4}-\d{2}-\d{2}$`
    - `materialType`: optional enum (`document`, `worksheet`, `presentation`, `video_link`, `reference_link`)
    - `limit`: optional integer (default 20, max 100)
    - `cursor`: optional string
  - Add `dailyMaterialsFeedQuerySchema`:
    - `date`: optional regex `^\d{4}-\d{2}-\d{2}$` (defaults to current date if omitted)
- `server/src/modules/students/students.repository.ts`:
  - Add `findMaterialsByChapterForStudent(chapterId: string, filters: StudentMaterialFilters, limit: number, cursor?: CursorPayload)`.
  - Add `findDailyMaterialsFeed(gradeId: string, schoolId: string, targetDate: Date)`.
- `server/src/modules/students/students.service.ts`:
  - Add `getMyChapterMaterials(callerUserId: string, chapterId: string, query: ListStudentMaterialsQuery)`.
    - Verifies that `chapterId` belongs to a subject active in `student.gradeId`.
  - Add `getMyDailyMaterialsFeed(callerUserId: string, query: DailyMaterialsFeedQuery)`.
- `server/src/modules/students/students.controller.ts`:
  - Add `getMyChapterMaterials(req, res)`.
  - Add `getMyDailyMaterialsFeed(req, res)`.
- `server/src/modules/students/students.routes.ts`:
  - Register `studentsRouter.get('/me/chapters/:chapterId/materials', authenticate, authorize('student'), validate({ params: studentChapterParamSchema, query: listStudentMaterialsQuerySchema }), studentsController.getMyChapterMaterials)`.
  - Register `studentsRouter.get('/me/materials/daily', authenticate, authorize('student'), validate({ query: dailyMaterialsFeedQuerySchema }), studentsController.getMyDailyMaterialsFeed)`.

#### 4.3 Target Endpoints & Responses

##### 1. Chapter Daily Materials
`GET /api/v1/students/me/chapters/111e8400-e29b-41d4-a716-446655440001/materials?date=2026-10-15`
```json
{
  "data": [
    {
      "id": "999e8400-e29b-41d4-a716-446655440001",
      "title": "Daily Practice Problem (DPP) - Day 14",
      "description": "Solve problems 1 to 10 on irrational proofs",
      "materialType": "worksheet",
      "fileUrl": "https://storage.learningmatters.com/materials/dpp-14.pdf",
      "fileName": "dpp-14.pdf",
      "fileSize": 524288,
      "mimeType": "application/pdf",
      "externalUrl": null,
      "uploadedAt": "2026-10-15T08:30:00.000Z",
      "uploadedBy": {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "name": "Dr. Sarah Smith"
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "hasMore": false,
    "nextCursor": null
  }
}
```

##### 2. Student Daily Feed (Dashboard / Home View)
`GET /api/v1/students/me/materials/daily?date=2026-10-15`
```json
{
  "date": "2026-10-15",
  "totalUploadsToday": 3,
  "subjects": [
    {
      "subjectId": "550e8400-e29b-41d4-a716-446655440000",
      "subjectName": "Mathematics",
      "materials": [
        {
          "id": "999e8400-e29b-41d4-a716-446655440001",
          "chapterId": "111e8400-e29b-41d4-a716-446655440001",
          "chapterTitle": "Real Numbers",
          "title": "Daily Practice Problem (DPP) - Day 14",
          "materialType": "worksheet",
          "fileUrl": "https://storage.learningmatters.com/materials/dpp-14.pdf",
          "uploadedAt": "2026-10-15T08:30:00.000Z"
        }
      ]
    },
    {
      "subjectId": "660e8400-e29b-41d4-a716-446655440000",
      "subjectName": "Physics",
      "materials": [
        {
          "id": "999e8400-e29b-41d4-a716-446655440002",
          "chapterId": "222e8400-e29b-41d4-a716-446655440001",
          "chapterTitle": "Light - Reflection & Refraction",
          "title": "Ray Diagrams Video Lecture",
          "materialType": "video_link",
          "externalUrl": "https://youtu.be/example123",
          "uploadedAt": "2026-10-15T10:00:00.000Z"
        }
      ]
    }
  ]
}
```

#### 4.4 Git Commit Message
```text
feat(students): implement daily uploaded materials retrieval with date filtering

- Add listStudentMaterialsQuerySchema and dailyMaterialsFeedQuerySchema
- Implement findMaterialsByChapterForStudent with date range and cursor pagination
- Implement findDailyMaterialsFeed for cross-subject daily homework/material timeline
- Add GET /api/v1/students/me/chapters/:chapterId/materials and /me/materials/daily
```

---

### Phase 5: Automated Testing, OpenAPI Documentation & Security Audit

#### 5.1 Objectives
- Unit tests covering `StudentsService` and `StudentsRepository` student-context methods.
- Integration tests simulating the full student journey:
  1. Student login with issued JWT token
  2. Call `/api/v1/students/me`
  3. Fetch assigned subjects only
  4. Fetch chapters of an assigned subject (assert success) and unassigned subject (assert `403 Forbidden`)
  5. Fetch daily materials with `?date=YYYY-MM-DD`
- OpenAPI 3.1 Swagger spec generation for frontend/mobile app consumption.

#### 5.2 Files to Modify / Create
- `server/src/modules/students/students.service.test.ts`: Add test cases for student context methods.
- `server/src/modules/students/students.repository.test.ts`: Add query integration tests.
- `server/src/modules/students/students.test.ts`: Add HTTP route integration tests for all 4 student app endpoints.
- `server/src/docs/openapi/`: Register student endpoints with `@asteasolutions/zod-to-openapi`.

#### 5.3 Git Commit Message
```text
test(students): add comprehensive test suite and openapi specs for student app apis

- Add unit tests for student self-profile, scoped subjects, chapters, and daily materials
- Add integration tests verifying cross-grade data isolation and 403 authorization guards
- Update OpenAPI schema definitions for all /api/v1/students/me endpoints
```

---

## 5. Security & Isolation Matrix

| Actor | Action / Resource | Permission | Rule / Check |
|---|---|---|---|
| **Student** | `GET /api/v1/students/me` | Allowed | Scoped strictly to `req.user.id`. |
| **Student** | `GET /api/v1/students/me/subjects` | Allowed | Scoped strictly to `student.gradeId`. |
| **Student** | `GET /api/v1/grades/:otherGradeId/subjects` | Denied (403) | Prevented if `:otherGradeId !== student.gradeId`. |
| **Student** | `GET /api/v1/students/me/subjects/:subjectId/chapters` | Allowed | Allowed ONLY if `:subjectId` belongs to `student.gradeId`. |
| **Student** | `GET /api/v1/students/me/chapters/:chapterId/materials` | Allowed | Allowed ONLY if chapter belongs to an active subject in `student.gradeId`. |
| **Student** | `POST/PATCH/DELETE` on materials or chapters | Denied (403) | Only teachers and admins can modify materials. |

---

## 6. Summary of Git Commit Sequence

```bash
# Phase 1
git commit -m "feat(students): auto-provision student user accounts and add /students/me profile endpoint"

# Phase 2
git commit -m "feat(students): implement scoped subject listing for student assigned grade"

# Phase 3
git commit -m "feat(students): add grade-scoped chapter navigation for assigned subjects"

# Phase 4
git commit -m "feat(students): implement daily uploaded materials retrieval with date filtering"

# Phase 5
git commit -m "test(students): add comprehensive test suite and openapi specs for student app apis"
```

# Teacher Portal Expansion Specification & Architecture

> **Document Version:** 1.0.0  
> **Target Subsystem:** Server (`server/src/modules/teachers`, `server/src/modules/chapters`, `server/src/db/schema`)  
> **Tech Stack:** Node.js 22 · Express 5 · TypeScript · Drizzle ORM · PostgreSQL · Zod · Argon2  

---

## 1. Executive Summary & Existing Features Assessment

### 1.1 Existing System Overview
Currently, the system provides:
1. **Teacher Profile Management (`teachers` table & module):**
   - Scoped to `schoolId` with unique constraints on `(school_id, lower(employee_id))` and `(school_id, lower(email))`.
   - Optional `userId` foreign key linking to `users.id` (set null on delete).
   - CRUD endpoints under `/api/v1/schools/:schoolId/teachers` and `/api/v1/teachers/:teacherId`.
   - Access restricted to `super_admin`, school `admin`, and `principal`. `teacher` role can only view their own profile.
2. **Teacher Assignments (`teacher_assignments` table & module):**
   - Many-to-many relationship linking `teacherId`, `gradeId`, and `subjectId` within a school.
   - Unique constraint on `(teacher_id, grade_id, subject_id)`.
   - Endpoints under `/api/v1/teacher-assignments`, `/api/v1/teachers/:teacherId/assignments`, `/api/v1/grades/:gradeId/teachers`, and `/api/v1/subjects/:subjectId/teachers`.
3. **Curriculum Hierarchy (`grades`, `subjects`, `chapters`):**
   - **Grade:** Scoped to board and school (`grades` table). Class teacher assigned via `class_teacher_id`.
   - **Subject:** Master subjects (`subjects` table) associated to grades via `grade_subjects` table.
   - **Chapter:** Belongs to a subject (`chapters` table) with `chapter_number`, `title`, and `description`.
   - Access control: While `teacher` has read access to master subjects and chapters, `gradesRouter` currently restricts `GET /api/v1/grades/:gradeId` to `super_admin`, `admin`, `principal`, and `class_teacher`. Regular `teacher` cannot query grades directly or view their contextual curriculum hierarchy.

---

## 2. Requirements Gap & Target Capabilities

| # | Requested Feature | Current State | Gap to Implement |
|---|---|---|---|
| **1** | Automatic User creation on Teacher creation (with dummy password) | Teacher created without a User record unless `userId` is manually passed. | Transactionally create a `users` record with role `teacher`, Argon2-hashed default password, link `teacher.userId = user.id`. |
| **2** | Teacher access to all assigned grades | Teacher can only fetch raw assignments via `/teachers/:teacherId/assignments`. | Dedicated endpoints (`/api/v1/teachers/me/grades`) returning distinct assigned grades with class teacher status & grade metadata. |
| **3** | Teacher access to subjects from assigned grades | Subjects are listed per grade (`/grades/:gradeId/subjects`), but not filtered by teacher assignment context. | Endpoint `/api/v1/teachers/me/grades/:gradeId/subjects` returning subjects assigned to the logged-in teacher in that grade. |
| **4** | Teacher access to chapters from assigned subjects | Chapters can be listed by subject ID, but no verification that teacher actually teaches that subject. | Endpoints `/api/v1/teachers/me/subjects/:subjectId/chapters` validating assignment before returning syllabus & chapters. |
| **5** | Teacher upload of taught materials for chapter | No file/material model or storage mechanism exists in the codebase. | Database table `chapter_materials`, file upload middleware/handler, upload & retrieval endpoints with teacher authorship verification. |
| **6** | Teacher upload of notes for specific chapters | No chapter notes table exists. | Database table `chapter_notes`, markdown/rich-text + attachment support, CRUD endpoints with teacher authorship and student read access. |

---

## 3. Detailed Architecture & Design Specifications

### 3.1 Feature 1: Automatic User Creation upon Teacher Creation

#### Functional Workflow
When `POST /api/v1/schools/:schoolId/teachers` is called:
1. Verify school access (`callerSchoolId === schoolId` or `callerRole === 'super_admin'`).
2. Validate input uniqueness in `teachers` (employee ID and email per school).
3. Validate that `email` does not already exist in `users` table (since `users.email` is globally unique).
4. Run inside a database transaction (`withTransaction`):
   - **Create User Record:**
     - `email`: Normalized lowercase teacher email.
     - `passwordHash`: Argon2 hash of default password (`Teacher@123` or configurable via `DEFAULT_TEACHER_PASSWORD` env).
     - `role`: `'teacher'`.
     - `schoolId`: `schoolId`.
     - `firstName`: Teacher's first name.
     - `lastName`: Teacher's last name.
     - `phone`: Teacher's phone number.
     - `status`: `'active'`.
     - `isActive`: `true`.
   - **Create Teacher Record:**
     - Pass the generated `user.id` into `teachers.userId`.
     - Insert teacher record.
5. If `userId` was explicitly provided in the request payload (legacy/admin-linked flow), respect that user ID instead of creating a duplicate.

#### Security & Password Policy
- Default dummy password: `Teacher@123` (hashed with Argon2 using standard production cost parameters: memory `65536`, time `3`, parallelism `1`).
- Optional flag `mustChangePassword: boolean` or user status configured to prompt password reset on first login.

---

### 3.2 Feature 2: Teacher Access to Assigned Grades

#### Endpoints
- `GET /api/v1/teachers/me/grades`
  - **Auth:** `authenticate`, `authorize('teacher', 'class_teacher')`
  - **Resolution:** Resolves `teacher` profile from `req.user.id` via `teachersRepository.findByUserId(req.user.id)`.
  - **Query:** Distinct grades linked to this teacher via active records in `teacher_assignments` (where `deletedAt IS NULL` and `status = 'active'`).
  - **Response Payload:**
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "name": "Grade 10 - Section A",
          "code": "G10-A",
          "gradeNumber": 10,
          "section": "A",
          "boardId": "uuid",
          "boardName": "CBSE",
          "isClassTeacher": true,
          "totalAssignedSubjects": 2
        }
      ]
    }
    ```
- `GET /api/v1/teachers/:teacherId/grades`
  - **Auth:** `authenticate`, `authorize('super_admin', 'admin', 'principal', 'teacher')`
  - **Rule:** A teacher can only access their own `teacherId`. School admin/principal can query any teacher in their school.

---

### 3.3 Feature 3: Teacher Access to Subjects from Assigned Grades

#### Endpoints
- `GET /api/v1/teachers/me/grades/:gradeId/subjects`
  - **Auth:** `authenticate`, `authorize('teacher', 'class_teacher')`
  - **Verification:** Verifies that the teacher is assigned to `gradeId` (or is the designated `classTeacherId`).
  - **Query:** Retrieves all subjects assigned to this teacher in this grade via `teacher_assignments`. If teacher is the `class_teacher` of the grade, optionally allow viewing all subjects in that grade.
  - **Response Payload:**
    ```json
    {
      "grade": {
        "id": "uuid",
        "name": "Grade 10 - Section A"
      },
      "subjects": [
        {
          "id": "uuid",
          "name": "Mathematics",
          "code": "MATH101",
          "description": "Standard Mathematics",
          "assignmentId": "uuid",
          "effectiveDate": "2026-06-01T00:00:00.000Z",
          "status": "active",
          "totalChapters": 12
        }
      ]
    }
    ```
- `GET /api/v1/teachers/me/subjects`
  - Returns all subjects taught by the teacher across all grades.

---

### 3.4 Feature 4: Teacher Access to Chapters from Assigned Subjects

#### Endpoints
- `GET /api/v1/teachers/me/subjects/:subjectId/chapters`
  - **Auth:** `authenticate`, `authorize('teacher', 'class_teacher')`
  - **Verification:** Verifies the teacher has at least one active assignment in `teacher_assignments` for `subjectId` (or belongs to the same school for class teachers).
  - **Query:** Returns all active chapters for this subject ordered by `chapterNumber ASC`.
  - **Response Payload:**
    ```json
    {
      "subject": {
        "id": "uuid",
        "name": "Mathematics",
        "code": "MATH101"
      },
      "chapters": [
        {
          "id": "uuid",
          "chapterNumber": 1,
          "title": "Real Numbers",
          "description": "Properties of real numbers and Euclid's division lemma",
          "status": "active",
          "totalMaterials": 3,
          "totalNotes": 2
        }
      ]
    }
    ```

---

### 3.5 Feature 5: Teacher Upload of Taught Material in Specific Chapter

#### Concept
Teaching materials represent instructional resources taught in class (e.g., lecture slides, worksheets, homework documents, reference PDFs, lab handouts, video URLs).

#### Database Schema: `chapter_materials`
```typescript
export const materialTypeEnum = pgEnum('material_type', [
  'document',      // PDF, DOCX, PPTX
  'worksheet',     // Practice exercises
  'presentation',  // Slide deck
  'video_link',    // YouTube, Vimeo, MP4 link
  'reference_link' // External educational URL
]);

export const chapterMaterials = pgTable('chapter_materials', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  materialType: materialTypeEnum('material_type').notNull().default('document'),
  fileUrl: text('file_url'),          // Path or URL to stored file
  fileName: text('file_name'),        // Original filename
  fileSize: integer('file_size'),      // Size in bytes
  mimeType: text('mime_type'),        // e.g. application/pdf
  externalUrl: text('external_url'),  // For video or reference links
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});
```

#### Upload & Storage Handling
1. **Multipart File Upload:**
   - Use `multer` with configurable disk storage (`uploads/materials/`) or cloud S3-compatible adapter.
   - Enforce file size limit (e.g. max 25MB) and allowlisted MIME types (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `image/png`, `image/jpeg`).
2. **Access Control:**
   - Teacher must be assigned to the subject of that chapter (or be school admin/principal).
   - Only the uploader (or admin/principal) can delete/update the material.

#### Endpoints
- `POST /api/v1/chapters/:chapterId/materials` — Upload/create teaching material.
- `GET /api/v1/chapters/:chapterId/materials` — List all materials for chapter (accessible by teachers, students, principals, admins).
- `GET /api/v1/chapters/:chapterId/materials/:materialId` — Get single material details/download link.
- `DELETE /api/v1/chapters/:chapterId/materials/:materialId` — Soft-delete material.

---

### 3.6 Feature 6: Teacher Upload of Chapter Notes

#### Concept
Chapter notes represent revision notes, summaries, or structured lecture notes prepared for students. They can be created either as rich text / Markdown content, or uploaded as PDF/handwritten notes documents.

#### Database Schema: `chapter_notes`
```typescript
export const noteTypeEnum = pgEnum('note_type', [
  'lecture_note',
  'revision_summary',
  'handwritten_note',
  'study_guide'
]);

export const chapterNotes = pgTable('chapter_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'),           // Text / Markdown content
  noteType: noteTypeEnum('note_type').notNull().default('lecture_note'),
  fileUrl: text('file_url'),          // Optional attachment (PDF / image)
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});
```

#### Endpoints
- `POST /api/v1/chapters/:chapterId/notes` — Create/upload chapter note (with optional file attachment or rich text content).
- `GET /api/v1/chapters/:chapterId/notes` — List notes for chapter (filters: `isPublished`, `noteType`).
- `GET /api/v1/chapters/:chapterId/notes/:noteId` — View note details.
- `PATCH /api/v1/chapters/:chapterId/notes/:noteId` — Update note content or publishing status.
- `DELETE /api/v1/chapters/:chapterId/notes/:noteId` — Soft-delete note.

---

## 4. RBAC & Security Permission Matrix

| Endpoint | Allowed Roles | Isolation Rule |
|---|---|---|
| `POST /schools/:schoolId/teachers` | `super_admin`, `admin`, `principal` | Scoped to caller's school. Creates User + Teacher in 1 transaction. |
| `GET /teachers/me/grades` | `teacher`, `class_teacher` | Returns only grades assigned to `req.user.id`'s teacher record. |
| `GET /teachers/me/grades/:gradeId/subjects` | `teacher`, `class_teacher` | Validates teacher is assigned to `gradeId`. |
| `GET /teachers/me/subjects/:subjectId/chapters` | `teacher`, `class_teacher` | Validates teacher is assigned to `subjectId`. |
| `POST /chapters/:chapterId/materials` | `teacher`, `class_teacher`, `admin` | Teacher must teach the parent subject. |
| `GET /chapters/:chapterId/materials` | `teacher`, `class_teacher`, `student`, `admin`, `principal` | Read access for all users in the school. |
| `DELETE /chapters/:chapterId/materials/:id` | `teacher` (owner only), `admin` | Teacher can only delete materials they authored. |
| `POST /chapters/:chapterId/notes` | `teacher`, `class_teacher`, `admin` | Teacher must teach the parent subject. |
| `GET /chapters/:chapterId/notes` | `teacher`, `class_teacher`, `student`, `admin`, `principal` | Students only see `isPublished: true`. |
| `PATCH/DELETE /chapters/:chapterId/notes/:id` | `teacher` (owner only), `admin` | Teacher can only modify notes they authored. |

---

## 5. Implementation Plan & File Organization

```
server/
├── src/
│   ├── config/
│   │   └── constants.ts              # Add DEFAULT_TEACHER_PASSWORD, upload limits
│   ├── db/
│   │   ├── schema/
│   │   │   ├── chapter-materials.ts  # New schema for taught materials
│   │   │   ├── chapter-notes.ts      # New schema for chapter notes
│   │   │   └── index.ts              # Re-export new schemas
│   │   └── migrate.ts                # Generate and run migration
│   ├── middleware/
│   │   └── upload.ts                 # Multer disk/memory storage middleware
│   ├── modules/
│   │   ├── teachers/
│   │   │   ├── teachers.service.ts   # Update createTeacher to auto-insert User + dummy pass
│   │   │   ├── teachers.routes.ts    # Add /me/grades, /me/subjects, /me/chapters routes
│   │   │   └── teachers.controller.ts# Implement handler methods
│   │   ├── chapters/
│   │   │   ├── chapters.routes.ts    # Mount materials & notes sub-routers
│   │   │   ├── materials/            # Chapter materials module
│   │   │   │   ├── materials.controller.ts
│   │   │   │   ├── materials.repository.ts
│   │   │   │   ├── materials.routes.ts
│   │   │   │   ├── materials.schemas.ts
│   │   │   │   └── materials.service.ts
│   │   │   └── notes/                # Chapter notes module
│   │   │       ├── notes.controller.ts
│   │   │       ├── notes.repository.ts
│   │   │       ├── notes.routes.ts
│   │   │       ├── notes.schemas.ts
│   │   │       └── notes.service.ts
```

---

## 6. Verification & Test Strategy

1. **Unit & Integration Tests:**
   - Teacher creation auto-creates `users` row with matching email, hashed dummy password, and role `teacher`.
   - Logging in via `/api/v1/auth/login` with created teacher email and dummy password succeeds and returns JWT tokens with role `teacher`.
   - `GET /api/v1/teachers/me/grades` returns only grades assigned to that specific teacher.
   - Unauthorized access attempts by other teachers rejected with `403 Forbidden`.
   - Teacher uploading material to a subject they do NOT teach rejected with `403 Forbidden`.
   - Teacher uploading material to an assigned subject's chapter succeeds with `201 Created`.
   - File size limit (>25MB) rejected with `400 Bad Request`.
   - Chapter notes published by teacher are visible to students of that grade; unpublished notes hidden from students.

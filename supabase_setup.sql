-- Tabella per le email autorizzate
CREATE TABLE authorized_emails (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    isAdmin BOOLEAN DEFAULT FALSE,
    notes TEXT,
    addedAt TIMESTAMPTZ DEFAULT NOW()
);

-- Inserimento admin predefinito
INSERT INTO authorized_emails (email, name, isAdmin)
VALUES ('admin@118ferrara.it', 'Amministratore', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Tabella per i corsi
CREATE TABLE courses (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title TEXT NOT NULL,
    description TEXT,
    instructor TEXT,
    location TEXT,
    date DATE,
    startTime TIME,
    duration INTEGER,
    maxParticipants INTEGER DEFAULT 20,
    image TEXT,
    status TEXT DEFAULT 'active',
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella per le iscrizioni
CREATE TABLE enrollments (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    courseId BIGINT REFERENCES courses(id) ON DELETE CASCADE,
    userId TEXT REFERENCES authorized_emails(email) ON DELETE CASCADE,
    enrolledAt TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(courseId, userId)
);

-- Tabella per la chat
CREATE TABLE course_messages (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    courseId BIGINT REFERENCES courses(id) ON DELETE CASCADE,
    userEmail TEXT REFERENCES authorized_emails(email) ON DELETE CASCADE,
    userName TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Abilitazione Real-time per la chat e i dati
-- Esegui questo nel SQL Editor di Supabase se non l'hai già fatto:
/*
begin;
  -- Rimuovi se esiste già per evitare errori
  drop publication if exists supabase_realtime;
  
  -- Crea la pubblicazione per le tabelle che necessitano aggiornamenti live
  create publication supabase_realtime for table courses, enrollments, course_messages;
commit;
*/

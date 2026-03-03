
-- Abilita RLS su tutte le tabelle (già attivo, ma per sicurezza)
ALTER TABLE authorized_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_messages ENABLE ROW LEVEL SECURITY;

-- Crea policy per accesso pubblico (anon)
-- Policy per authorized_emails
CREATE POLICY "Public Access authorized_emails" ON authorized_emails
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Policy per courses
CREATE POLICY "Public Access courses" ON courses
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Policy per enrollments
CREATE POLICY "Public Access enrollments" ON enrollments
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Policy per course_messages
CREATE POLICY "Public Access course_messages" ON course_messages
FOR ALL
TO public
USING (true)
WITH CHECK (true);

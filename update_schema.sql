-- Aggiunta colonne mancanti alla tabella authorized_emails
ALTER TABLE authorized_emails ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE authorized_emails ADD COLUMN IF NOT EXISTS role TEXT;

-- Assicuriamoci che l'admin esista e abbia i campi corretti
-- Usiamo l'email fornita in precedenza
INSERT INTO authorized_emails (email, name, "isadmin", company, role)
VALUES ('admin@118ferrara.it', 'Amministratore', TRUE, '118 Ferrara', 'Admin')
ON CONFLICT (email) 
DO UPDATE SET 
    "isadmin" = EXCLUDED."isadmin",
    company = COALESCE(authorized_emails.company, EXCLUDED.company),
    role = COALESCE(authorized_emails.role, EXCLUDED.role);

-- Verifica RLS per permettere la registrazione (inserimento) e lettura
-- Se fix_rls.sql è già stato eseguito, questo conferma l'accesso pubblico
ALTER TABLE authorized_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access authorized_emails" ON authorized_emails;
CREATE POLICY "Public Access authorized_emails" ON authorized_emails
FOR ALL
TO public
USING (true)
WITH CHECK (true);

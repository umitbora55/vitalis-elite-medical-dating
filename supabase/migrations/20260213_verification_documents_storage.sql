-- Storage bucket + policies for verification documents.
-- Files are stored under "<user_id>/<timestamp>-<filename>".

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own verification docs" ON storage.objects;
CREATE POLICY "Users can upload own verification docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can read own verification docs" ON storage.objects;
CREATE POLICY "Users can read own verification docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own verification docs" ON storage.objects;
CREATE POLICY "Users can delete own verification docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

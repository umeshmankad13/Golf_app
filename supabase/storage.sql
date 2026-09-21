-- Run this in Supabase SQL Editor to enable proof uploads
-- https://supabase.com/dashboard/project/olnsstrzxlpcoqxetogn/sql/new

-- Create storage bucket for winner proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'winner-proofs',
  'winner-proofs',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload proof files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'winner-proofs'
  AND (storage.foldername(name))[1] = 'proofs'
);

-- Allow public read access to proof files
CREATE POLICY "Public can view proof files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'winner-proofs');

-- Allow users to update their own proof files
CREATE POLICY "Authenticated users can update their proof files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'winner-proofs');

-- Create storage bucket for charity images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'charity-images',
  'charity-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (admins) to upload charity images
CREATE POLICY "Authenticated users can upload charity images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'charity-images'
  AND (storage.foldername(name))[1] = 'charities'
);

-- Allow public read access to charity images
CREATE POLICY "Public can view charity images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'charity-images');

-- Allow authenticated users to update charity images
CREATE POLICY "Authenticated users can update charity images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'charity-images');

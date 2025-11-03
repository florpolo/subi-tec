/*
  # Configure Supabase Storage for Multi-Tenant Files
  
  Sets up storage buckets for company-scoped file uploads with proper RLS policies.
  
  ## 1. Storage Buckets
  
  ### `work-order-photos`
  - Stores photos uploaded during work order completion
  - Files organized by company_id/work_order_id/filename
  - Public bucket for authenticated users
  
  ### `work-order-signatures`
  - Stores signature images from completed work orders
  - Files organized by company_id/work_order_id/signature
  - Public bucket for authenticated users
  
  ## 2. Security
  
  Storage policies ensure:
  - Users can only upload files to their company's folder
  - Users can only view/download files from their company's folder
  - File paths must start with the user's company_id
  - Only company members can delete files from their company
  
  ## 3. Important Notes
  
  - Bucket names use hyphens (storage convention)
  - RLS policies check company membership via company_members table
  - Path structure: {company_id}/{work_order_id}/{filename}
*/

-- Create storage bucket for work order photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-order-photos', 'work-order-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for work order signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-order-signatures', 'work-order-signatures', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for work-order-photos bucket
CREATE POLICY "Users can upload photos to their company folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'work-order-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view photos from their companies"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'work-order-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos from their companies"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'work-order-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for work-order-signatures bucket
CREATE POLICY "Users can upload signatures to their company folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'work-order-signatures'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view signatures from their companies"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'work-order-signatures'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete signatures from their companies"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'work-order-signatures'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM company_members
      WHERE user_id = auth.uid()
    )
  );

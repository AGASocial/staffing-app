import { NextResponse } from 'next/server';
import { createAuthenticatedRouteClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/candidates/[id]/resume
 * Uploads a resume PDF/DOC for a candidate and stores the path in the DB.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { supabase, user } = await createAuthenticatedRouteClient();
  const { id } = await params;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOC, DOCX, and TXT are allowed.' },
        { status: 400 }
      );
    }

    // Max 10 MB
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10 MB.' },
        { status: 400 }
      );
    }

    // Delete old resume if one exists
    const { data: candidate } = await supabase
      .from('staffing_candidates')
      .select('resume_url')
      .eq('id', id)
      .single();

    if (candidate?.resume_url) {
      await supabaseAdmin.storage.from('resumes').remove([candidate.resume_url]);
    }

    // Build a clean storage path: resumes/{candidateId}/{timestamp}-{safeFileName}
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${id}/${Date.now()}-${safeFileName}`;

    const fileBuffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('resumes')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Resume upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Persist the storage path back to the candidate record
    const { data: updated, error: updateError } = await supabase
      .from('staffing_candidates')
      .update({
        resume_url: uploadData.path,
        resume_file_name: file.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, resume_url, resume_file_name')
      .single();

    if (updateError) {
      console.error('Error saving resume path:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    console.error('Resume upload processing error:', err);
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
  }
}

/**
 * GET /api/candidates/[id]/resume
 * Returns a short-lived signed URL for downloading the candidate's resume.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { supabase, user } = await createAuthenticatedRouteClient();
  const { id } = await params;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: candidate } = await supabase
    .from('staffing_candidates')
    .select('resume_url, resume_file_name')
    .eq('id', id)
    .single();

  if (!candidate?.resume_url) {
    return NextResponse.json({ error: 'No resume on file' }, { status: 404 });
  }

  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from('resumes')
    .createSignedUrl(candidate.resume_url, 60 * 5); // 5 minutes

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate download URL' }, { status: 500 });
  }

  return NextResponse.json({
    url: signedData.signedUrl,
    file_name: candidate.resume_file_name,
  });
}

/**
 * DELETE /api/candidates/[id]/resume
 * Removes a candidate's resume from storage and clears DB fields.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { supabase, user } = await createAuthenticatedRouteClient();
  const { id } = await params;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: candidate } = await supabase
    .from('staffing_candidates')
    .select('resume_url')
    .eq('id', id)
    .single();

  if (!candidate?.resume_url) {
    return NextResponse.json({ error: 'No resume on file' }, { status: 404 });
  }

  await supabaseAdmin.storage.from('resumes').remove([candidate.resume_url]);

  await supabase
    .from('staffing_candidates')
    .update({ resume_url: null, resume_file_name: null, updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ success: true });
}

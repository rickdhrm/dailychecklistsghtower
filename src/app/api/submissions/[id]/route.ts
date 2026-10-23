import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const res = await query(
      `SELECT s.id, s.template_id, s.template_version, s.technician_id, s.location_id,
              s.status, s.has_abnormal_reading, s.technician_notes, s.submission_data,
              s.submitted_at, s.updated_at, s.is_archived,
              t.title AS template_title, t.code AS template_code, t.category AS template_category,
              t.schema_definition,
              u.full_name AS technician_name, u.employee_code,
              l.name AS location_name, l.floor AS location_floor, l.building AS location_building
       FROM form_submissions s
       JOIN form_templates t ON s.template_id = t.id
       JOIN users u ON s.technician_id = u.id
       JOIN locations l ON s.location_id = l.id
       WHERE s.id = $1`,
      [id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = res.rows[0];

    // RBAC: technician can only view their own unless Admin/SPV
    if (currentUser.role === 'TECHNICIAN' && submission.technician_id !== currentUser.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(submission);
  } catch (error: any) {
    console.error('Error fetching submission:', error);
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { submission_data, technician_notes, has_abnormal_reading, change_reason } = body;

    // Get current record to verify ownership and record audit
    const existingRes = await query(`SELECT * FROM form_submissions WHERE id = $1`, [id]);
    if (existingRes.rowCount === 0) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    if (currentUser.role === 'TECHNICIAN' && existing.technician_id !== currentUser.id) {
      return NextResponse.json({ error: 'You can only edit your own submissions' }, { status: 403 });
    }

    // 1. Insert audit log
    await query(
      `INSERT INTO form_submission_audits (
        submission_id, modified_by, previous_data, new_data, change_reason
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        currentUser.id,
        JSON.stringify(existing.submission_data),
        JSON.stringify(submission_data || existing.submission_data),
        change_reason || 'Updated by user'
      ]
    );

    // 2. Update submission
    const res = await query(
      `UPDATE form_submissions
       SET submission_data = COALESCE($1, submission_data),
           technician_notes = COALESCE($2, technician_notes),
           has_abnormal_reading = COALESCE($3, has_abnormal_reading),
           status = 'REVISED',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, status, updated_at`,
      [
        submission_data ? JSON.stringify(submission_data) : null,
        technician_notes,
        has_abnormal_reading,
        id
      ]
    );

    return NextResponse.json({ success: true, updated: res.rows[0] });
  } catch (error: any) {
    console.error('Error updating submission:', error);
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
  }
}

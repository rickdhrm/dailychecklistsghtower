import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('location_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const templateId = searchParams.get('template_id');
  const status = searchParams.get('status');
  const technicianId = searchParams.get('technician_id');

  try {
    let sql = `
      SELECT s.id, s.template_id, s.template_version, s.technician_id, s.location_id,
             s.status, s.has_abnormal_reading, s.technician_notes, s.submission_data,
             s.submitted_at, s.updated_at, s.is_archived,
             t.title AS template_title, t.code AS template_code, t.category AS template_category,
             u.full_name AS technician_name, u.employee_code,
             l.name AS location_name, l.floor AS location_floor, l.building AS location_building
      FROM form_submissions s
      JOIN form_templates t ON s.template_id = t.id
      JOIN users u ON s.technician_id = u.id
      JOIN locations l ON s.location_id = l.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let pIdx = 1;

    // Technicians only see their own submissions unless Admin/SPV
    if (currentUser.role === 'TECHNICIAN') {
      sql += ` AND s.technician_id = $${pIdx++}`;
      params.push(currentUser.id);
    } else if (technicianId) {
      sql += ` AND s.technician_id = $${pIdx++}`;
      params.push(technicianId);
    }

    if (locationId) {
      sql += ` AND s.location_id = $${pIdx++}`;
      params.push(locationId);
    }

    if (templateId) {
      sql += ` AND s.template_id = $${pIdx++}`;
      params.push(templateId);
    }

    if (status) {
      sql += ` AND s.status = $${pIdx++}`;
      params.push(status);
    }

    if (dateFrom) {
      sql += ` AND s.submitted_at >= $${pIdx++}::timestamptz`;
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ` AND s.submitted_at <= $${pIdx++}::timestamptz`;
      params.push(dateTo);
    }

    sql += ` ORDER BY s.submitted_at DESC LIMIT 200`;

    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('Error querying submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { template_id, location_id, submission_data, technician_notes, has_abnormal_reading } = body;

    if (!template_id || !location_id || !submission_data) {
      return NextResponse.json({ error: 'Missing required submission fields' }, { status: 400 });
    }

    // Fetch active template version
    const tmplRes = await query(`SELECT version FROM form_templates WHERE id = $1`, [template_id]);
    if (tmplRes.rowCount === 0) {
      return NextResponse.json({ error: 'Form template not found' }, { status: 404 });
    }
    const templateVersion = tmplRes.rows[0].version;

    const status = has_abnormal_reading ? 'FLAGGED_ABNORMAL' : 'SUBMITTED';

    const res = await query(
      `INSERT INTO form_submissions (
        template_id, template_version, technician_id, location_id, status, has_abnormal_reading, technician_notes, submission_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, template_id, template_version, technician_id, location_id, status, has_abnormal_reading, submitted_at`,
      [
        template_id,
        templateVersion,
        currentUser.id,
        location_id,
        status,
        !!has_abnormal_reading,
        technician_notes || '',
        JSON.stringify(submission_data)
      ]
    );

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating submission:', error);
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }
}

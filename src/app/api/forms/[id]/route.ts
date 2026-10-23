import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await query(
      `SELECT id, code, title, description, category, form_type, version, is_active, schema_definition, created_at, updated_at
       FROM form_templates
       WHERE id = $1`,
      [id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Form template not found' }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    console.error('Error fetching form template:', error);
    return NextResponse.json({ error: 'Failed to fetch form template' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SPV')) {
    return NextResponse.json({ error: 'Unauthorized to update forms' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, category, form_type, schema_definition, is_active } = body;

    const res = await query(
      `UPDATE form_templates
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           form_type = COALESCE($4, form_type),
           schema_definition = COALESCE($5, schema_definition),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, code, title, description, category, form_type, version, is_active, schema_definition, updated_at`,
      [title, description, category, form_type, schema_definition ? JSON.stringify(schema_definition) : null, is_active, id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Form template not found' }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    console.error('Error updating form template:', error);
    return NextResponse.json({ error: 'Failed to update form template' }, { status: 500 });
  }
}

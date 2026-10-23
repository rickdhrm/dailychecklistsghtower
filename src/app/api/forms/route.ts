import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const res = await query(
      `SELECT id, code, title, description, category, form_type, version, is_active, schema_definition, created_at, updated_at
       FROM form_templates
       WHERE is_active = true
       ORDER BY category, title ASC`
    );
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('Error fetching forms:', error);
    return NextResponse.json({ error: 'Failed to fetch form templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SPV')) {
    return NextResponse.json({ error: 'Unauthorized to create forms' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { code, title, description, category, form_type, schema_definition } = body;

    if (!code || !title || !category || !schema_definition) {
      return NextResponse.json({ error: 'Missing required form template fields' }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO form_templates (code, title, description, category, form_type, version, is_active, schema_definition, created_by)
       VALUES ($1, $2, $3, $4, $5, 1, true, $6, $7)
       RETURNING id, code, title, description, category, form_type, version, is_active, schema_definition, created_at`,
      [code.trim().toUpperCase(), title.trim(), description || '', category.trim(), form_type || 'CUSTOM', JSON.stringify(schema_definition), currentUser.id]
    );

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating form template:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Form template code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create form template' }, { status: 500 });
  }
}

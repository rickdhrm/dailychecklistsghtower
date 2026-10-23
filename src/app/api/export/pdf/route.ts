import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('location_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  try {
    let sql = `
      SELECT s.id, t.title AS checklist_name, t.category,
             l.name AS location_name, l.building, l.floor,
             u.full_name AS technician_name,
             s.status, s.has_abnormal_reading, s.technician_notes,
             s.submitted_at
      FROM form_submissions s
      JOIN form_templates t ON s.template_id = t.id
      JOIN users u ON s.technician_id = u.id
      JOIN locations l ON s.location_id = l.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (locationId) {
      sql += ` AND s.location_id = $${pIdx++}`;
      params.push(locationId);
    }
    if (dateFrom) {
      sql += ` AND s.submitted_at >= $${pIdx++}::timestamptz`;
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ` AND s.submitted_at <= $${pIdx++}::timestamptz`;
      params.push(dateTo);
    }

    sql += ` ORDER BY s.submitted_at DESC LIMIT 100`;

    const res = await query(sql, params);

    const doc = new jsPDF({ orientation: 'landscape' });

    // Header Branding
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('SGH FACILITY MANAGEMENT - DAILY INSPECTION REPORT', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString('id-ID')} | Requested by: ${currentUser.full_name} (${currentUser.role})`, 14, 28);

    const tableRows = res.rows.map((r: any, i: number) => [
      i + 1,
      r.checklist_name,
      r.location_name,
      r.technician_name,
      r.has_abnormal_reading ? 'ABNORMAL' : 'NORMAL',
      r.status,
      new Date(r.submitted_at).toLocaleString('id-ID'),
      r.technician_notes || '-'
    ]);

    autoTable(doc, {
      startY: 34,
      head: [['#', 'Checklist', 'Location', 'Technician', 'Condition', 'Status', 'Date/Time', 'Notes']],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sgh_inspection_report_${Date.now()}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF export:', error);
    return NextResponse.json({ error: 'Failed to generate PDF export' }, { status: 500 });
  }
}

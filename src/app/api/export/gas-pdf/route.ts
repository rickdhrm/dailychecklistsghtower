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
  const submissionId = searchParams.get('submission_id');

  try {
    let subData: any = {};
    let technicianName = currentUser.full_name;
    let submittedDate = new Date().toLocaleDateString('id-ID');
    let submittedTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    let locationName = 'Main Gas Regulating Manifold';
    let temuan = '-';
    let tindakanKoreksi = '-';
    let statusInspection = 'Normal';

    if (submissionId) {
      const res = await query(
        `SELECT s.*, u.full_name as technician_name, l.name as location_name 
         FROM form_submissions s 
         JOIN users u ON s.technician_id = u.id 
         JOIN locations l ON s.location_id = l.id 
         WHERE s.id = $1`,
        [submissionId]
      );
      if (res.rowCount && res.rowCount > 0) {
        const row = res.rows[0];
        subData = row.submission_data || {};
        technicianName = row.technician_name;
        locationName = row.location_name;
        const d = new Date(row.submitted_at);
        submittedDate = d.toLocaleDateString('id-ID');
        submittedTime = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        temuan = subData.temuan || row.technician_notes || '-';
        tindakanKoreksi = subData.tindakan_koreksi || '-';
        statusInspection = subData.status_inspeksi || (row.has_abnormal_reading ? 'Perlu Perbaikan' : 'Normal');
      }
    }

    // Initialize Landscape A4 Document
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Page boundaries: A4 landscape is 297mm x 210mm
    // 1. Top Header Box (Right)
    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.3);
    doc.rect(230, 8, 57, 20);
    doc.line(250, 8, 250, 28);
    doc.line(230, 13, 287, 13);
    doc.line(230, 18, 287, 18);
    doc.line(230, 23, 287, 23);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('No. Form', 232, 11.5);
    doc.text(':  FR-LO-005', 252, 11.5);

    doc.text('Revisi', 232, 16.5);
    doc.text(':  00', 252, 16.5);

    doc.text('Tanggal', 232, 21.5);
    doc.text(':  26 Agustus 2026', 252, 21.5);

    doc.text('Halaman', 232, 26.5);
    doc.text(':  1 dari 1', 252, 26.5);

    // 2. Title Section (Center/Left)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMULIR', 148, 14, { align: 'center' });
    doc.setFontSize(12);
    doc.text('CHECKLIST INSPEKSI GAS LPG SENTRAL', 148, 20, { align: 'center' });

    // 3. Metadata Header Line
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal    : ${submittedDate}`, 10, 32);
    doc.text(`Jam          : ${submittedTime}`, 10, 36);
    doc.text(`Lokasi      : ${locationName}`, 10, 40);

    doc.text(`Petugas                                : ${technicianName}`, 148, 32);
    doc.text(`Kondisi Normal / Tidak Normal : ${statusInspection.toUpperCase()}`, 148, 36);

    // 4. Tables Definition (Left and Right)
    const leftSections = [
      {
        header: 'A. AREA TABUNG LPG',
        items: [
          'Tabung dalam kondisi baik.',
          'Tidak terdapat penyok/kerusakan berat.',
          'Tidak terdapat korosi berlebihan.',
          'Tidak terdapat indikasi kebocoran.',
          'Valve tabung dalam kondisi baik.',
          'Tabung berdiri/terpasang sesuai sistem penempatannya.',
          'Tabung terlindung dari benturan.',
          'Area bebas sumber api.',
          'Area bebas rokok.',
          'Tidak ada barang yang tidak berkaitan dengan LPG.',
          'Ventilasi area baik.',
          'Akses menuju tabung tidak terhalang.'
        ],
        code: 'a'
      },
      {
        header: 'B. MANIFOLD DAN VALVE',
        items: [
          'Manifold tidak mengalami kerusakan.',
          'Sambungan tidak menunjukkan indikasi kebocoran.',
          'Valve dapat dioperasikan.',
          'Valve diberi identifikasi.',
          'Tidak terdapat korosi berat.',
          'Tidak terdapat modifikasi tidak resmi.',
          'Kondisi fitting baik.'
        ],
        code: 'b'
      },
      {
        header: 'C. VAPORIZER',
        items: [
          'Kondisi fisik baik.',
          'Tidak terdapat kebocoran.',
          'Tidak terdapat suara/getaran abnormal.',
          'Sambungan baik.',
          'Pressure/indikator dalam kondisi normal sesuai spesifikasi.',
          'Tidak terdapat kerusakan komponen.',
          'Area sekitar vaporizer bersih.',
          'Tidak ada sumber api.',
          'Sistem pengaman vaporizer dalam kondisi baik.'
        ],
        code: 'c'
      },
      {
        header: 'E. PIPA DAN FITTING',
        items: [
          'Pipa tidak rusak.',
          'Tidak terdapat korosi berat.',
          'Tidak terdapat kebocoran.',
          'Support pipa dalam kondisi baik.',
          'Fitting tidak longgar.',
          'Tidak ada modifikasi tanpa izin.',
          'Jalur pipa tidak terhalang.'
        ],
        code: 'e'
      }
    ];

    const rightSections = [
      {
        header: 'F. SISTEM KESELAMATAN',
        items: [
          'APAR tersedia.',
          'APAR mudah diakses.',
          'APAR tidak terhalang.',
          'APAR masih dalam masa pemeriksaan.',
          'Rambu DILARANG MEROKOK tersedia.',
          'Rambu BAHAYA GAS tersedia.',
          'Emergency contact tersedia.',
          'Gas detector berfungsi.',
          'Alarm berfungsi.',
          'Ventilasi baik.'
        ],
        code: 'f'
      },
      {
        header: 'G. AREA KITCHEN TENANT',
        items: [
          'Tidak terdapat bau gas.',
          'Seluruh peralatan gas dalam kondisi baik.',
          'Burner berfungsi normal.',
          'Valve peralatan berfungsi.',
          'Tidak terdapat selang/fitting rusak.',
          'Tidak terdapat grease berlebihan.',
          'Tidak ada api terbuka yang tidak diperlukan.',
          'Peralatan gas tidak ditinggalkan tanpa pengawasan.',
          'Valve ditutup setelah operasional.'
        ],
        code: 'g'
      },
      {
        header: 'H. ADMINISTRASI',
        items: [
          'Checklist sebelumnya tersedia.',
          'Maintenance terakhir tercatat.',
          'Laporan gangguan telah ditindaklanjuti.',
          'Dokumen vendor tersedia.',
          'Dokumen pemeriksaan tersedia.',
          'Personel pengguna telah mendapatkan briefing.',
          'Tidak terdapat pekerjaan/modifikasi tanpa izin.'
        ],
        code: 'h'
      }
    ];

    const formatTableRows = (sections: any[]) => {
      const rows: any[] = [];
      sections.forEach(sec => {
        // Section Header Row
        rows.push([
          { content: sec.header, colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ]);
        // Items
        sec.items.forEach((item: string, i: number) => {
          const itemNo = i + 1;
          const fieldId = `gas_${sec.code}_${itemNo}`;
          const condition = subData[fieldId] || 'GOOD';
          const totalVal = subData[`${fieldId}_total`] || '';
          const remarksVal = subData[`${fieldId}_remarks`] || '';
          
          rows.push([
            itemNo,
            item,
            totalVal,
            condition === 'GOOD' ? '√' : '',
            condition === 'BAD' ? '√' : '',
            remarksVal
          ]);
        });
      });
      return rows;
    };

    const leftRows = formatTableRows(leftSections);
    const rightRows = formatTableRows(rightSections);

    // Render Left Table
    autoTable(doc, {
      startY: 43,
      margin: { left: 10 },
      tableWidth: 135,
      head: [
        [
          { content: 'NO', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'ITEMS', rowSpan: 2, styles: { valign: 'middle' } },
          { content: 'TOTAL', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'CONDITION', colSpan: 2, styles: { halign: 'center' } },
          { content: 'REMARKS', rowSpan: 2, styles: { valign: 'middle' } }
        ],
        ['GOOD', 'BAD']
      ],
      body: leftRows,
      theme: 'grid',
      styles: { fontSize: 5.5, cellPadding: 0.8, lineColor: [50, 50, 50], lineWidth: 0.2 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 6, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 12, halign: 'center' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 23 }
      }
    });

    // Render Right Table
    autoTable(doc, {
      startY: 43,
      margin: { left: 152 },
      tableWidth: 135,
      head: [
        [
          { content: 'NO', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'ITEMS', rowSpan: 2, styles: { valign: 'middle' } },
          { content: 'TOTAL', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'CONDITION', colSpan: 2, styles: { halign: 'center' } },
          { content: 'REMARKS', rowSpan: 2, styles: { valign: 'middle' } }
        ],
        ['GOOD', 'BAD']
      ],
      body: rightRows,
      theme: 'grid',
      styles: { fontSize: 5.5, cellPadding: 0.8, lineColor: [50, 50, 50], lineWidth: 0.2 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 6, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 12, halign: 'center' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 23 }
      }
    });

    // 5. Bottom Section: Temuan, Status & TTD Matrix
    const finalY = 168;

    // Temuan Box (Left)
    doc.rect(10, finalY, 100, 34);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('TEMUAN', 12, finalY + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(`Temuan: ${temuan}`, 12, finalY + 9);
    doc.line(12, finalY + 12, 108, finalY + 12);
    doc.line(12, finalY + 16, 108, finalY + 16);

    doc.text(`Tindakan Koreksi: ${tindakanKoreksi}`, 12, finalY + 22);
    doc.line(12, finalY + 25, 108, finalY + 25);
    doc.line(12, finalY + 29, 108, finalY + 29);

    // Status Box (Middle)
    doc.rect(112, finalY, 75, 34);
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', 115, finalY + 5);
    doc.setFont('helvetica', 'normal');

    const isNormal = statusInspection.toLowerCase() === 'normal';
    const isPerlu = statusInspection.toLowerCase().includes('perbaikan');
    const isCritical = statusInspection.toLowerCase().includes('critical') || statusInspection.toLowerCase().includes('isolasi');

    doc.text(`[ ${isNormal ? 'X' : ' '} ]  Normal`, 115, finalY + 13);
    doc.text(`[ ${isPerlu ? 'X' : ' '} ]  Perlu Perbaikan`, 115, finalY + 21);
    doc.text(`[ ${isCritical ? 'X' : ' '} ]  Critical – Gas Harus Diisolasi`, 115, finalY + 29);

    // TTD Table (Right)
    doc.rect(190, finalY, 97, 34);
    doc.line(220, finalY, 220, finalY + 34);
    doc.line(245, finalY, 245, finalY + 34);

    doc.line(190, finalY + 7, 287, finalY + 7);
    doc.line(190, finalY + 14, 287, finalY + 14);
    doc.line(190, finalY + 21, 287, finalY + 21);
    doc.line(190, finalY + 28, 287, finalY + 28);

    doc.setFont('helvetica', 'bold');
    doc.text('TTD', 230, finalY + 5, { align: 'center' });
    doc.text('NAMA', 266, finalY + 5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text('Petugas', 192, finalY + 11.5);
    doc.text(technicianName, 247, finalY + 11.5);

    doc.text('Engineering', 192, finalY + 18.5);
    doc.text(subData.engineering_nama || 'Andi (SPV)', 247, finalY + 18.5);

    doc.text('HSE', 192, finalY + 25.5);
    doc.text(subData.hse_nama || 'HSE Officer', 247, finalY + 25.5);

    doc.text('Building Manager', 192, finalY + 32.5);
    doc.text(subData.building_manager_nama || 'Lead BM', 247, finalY + 32.5);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="FR-LO-005_Checklist_Gas_${Date.now()}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('Error generating Gas PDF:', err);
    return NextResponse.json({ error: 'Failed to generate official Gas checklist PDF' }, { status: 500 });
  }
}

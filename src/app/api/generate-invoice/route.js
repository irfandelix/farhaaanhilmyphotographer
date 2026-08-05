import { NextResponse } from 'next/server';
import { getProjectById } from '@/lib/projectService';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'invoice'; // 'invoice' or 'receipt'

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // 1. Ambil data klien dari database
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 2. Format angka menjadi Rupiah yang rapi (contoh: 1.500.000)
    const formatRp = (num) => {
      if (!num) return '0';
      return Number(num).toLocaleString('id-ID');
    };

    const paymentAmount = Number(project.paymentAmount || 0);
    const dpAmount = Number(project.dpAmount || 0);
    const sisaTagihan = paymentAmount - dpAmount;

    // Siapkan data untuk docxtemplater
    const templateData = {
      clientName: project.clientName || '-',
      photoType: project.photoType || '-',
      shootDate: project.shootDate || '-',
      paymentStatus: project.paymentStatus || 'Belum Bayar',
      description: project.description || '',
      paymentAmount: formatRp(paymentAmount),
      dpAmount: formatRp(dpAmount),
      
      // Khusus untuk user bahasa Indonesia di template Word
      total_harga: formatRp(paymentAmount),
      uang_muka: formatRp(dpAmount),
      sisa_tagihan: formatRp(sisaTagihan),
      
      // Rincian items (jika ada, format harganya juga)
      items: (project.items || []).map(item => ({
        name: item.name,
        qty: item.qty,
        price: formatRp(item.price),
        total_price: formatRp(Number(item.qty) * Number(item.price))
      }))
    };

    // 3. Baca file template
    let templateFileName = 'invoice.docx';
    if (type === 'receipt') templateFileName = 'receipt.docx';
    if (type === 'receipt_dp') templateFileName = 'receipt_dp.docx';
    
    let templatePath = path.resolve(process.cwd(), 'public', 'templates', templateFileName);
    
    // Fallback if receipt_dp.docx doesn't exist, use invoice.docx
    if (type === 'receipt_dp' && !fs.existsSync(templatePath)) {
      templateFileName = 'invoice.docx';
      templatePath = path.resolve(process.cwd(), 'public', 'templates', templateFileName);
    }

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ 
        error: `Template ${templateFileName} tidak ditemukan. Harap upload ke folder public/templates/` 
      }, { status: 404 });
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // 4. Render template dengan docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(templateData);

    // 5. Generate hasil docx dalam bentuk Buffer
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // 6. Kembalikan file ke browser untuk di-download
    let prefix = 'Invoice';
    if (type === 'receipt') prefix = 'Tanda_Terima';
    if (type === 'receipt_dp') prefix = 'Tanda_Terima_DP';
    
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${prefix}_${project.clientName.replace(/\s+/g, '_')}.docx"`
      }
    });

  } catch (error) {
    console.error('Error generating DOCX:', error);
    return NextResponse.json({ error: 'Gagal membuat file DOCX' }, { status: 500 });
  }
}

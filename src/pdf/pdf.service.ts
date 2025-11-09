import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { buildLectureHtml } from './pdf.template';
import { LectureResultDocument } from '../db/schemas/lecture-result.schema';

@Injectable()
export class PdfService {
  async generatePdfBuffer(
    lecture: LectureResultDocument | any,
  ): Promise<Buffer> {
    const html = buildLectureHtml(lecture);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}

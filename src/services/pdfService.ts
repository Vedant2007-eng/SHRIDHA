import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FeedbackReport } from '../types/feedback';

export const generateReportPDF = async (
  report: FeedbackReport,
  reportElementId?: string
): Promise<boolean> => {
  try {
    // If an HTML element is provided and available, capture it via html2canvas with dark/light premium rendering
    const element = reportElementId ? document.getElementById(reportElementId) : null;

    if (element) {
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#120507',
          windowWidth: element.scrollWidth,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
        }

        pdf.save('CareVoice-Hospital-Feedback-Report.pdf');
        return true;
      } catch (canvasErr) {
        console.warn('html2canvas capture had an issue, falling back to programmatic PDF builder:', canvasErr);
      }
    }

    // Programmatic Clean PDF Generator Fallback / Direct Generator
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryRed = [180, 28, 40];
    const darkBg = [23, 9, 11];
    const lightText = [245, 230, 232];
    const mutedText = [184, 155, 158];

    // Background header
    doc.setFillColor(38, 14, 18);
    doc.rect(0, 0, 210, 45, 'F');

    // Accent line
    doc.setFillColor(230, 57, 70);
    doc.rect(0, 44, 210, 1.5, 'F');

    // Title & Logo text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('CAREVOICE', 16, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(230, 57, 70);
    doc.text('HOSPITAL VOICE FEEDBACK REPORT', 16, 26);

    // Meta details on right
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(9);
    doc.text(`ID: ${report.feedbackId}`, 194, 16, { align: 'right' });
    doc.text(`Date: ${report.date} | ${report.time}`, 194, 22, { align: 'right' });
    doc.text(`Language: ${report.language}`, 194, 28, { align: 'right' });

    let y = 55;

    // Overall Score Box
    doc.setFillColor(248, 245, 246);
    doc.roundedRect(15, y, 180, 32, 3, 3, 'F');
    doc.setDrawColor(230, 57, 70);
    doc.roundedRect(15, y, 180, 32, 3, 3, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(59, 14, 20);
    doc.text('OVERALL HOSPITAL PATIENT SATISFACTION', 22, y + 10);

    doc.setFontSize(22);
    doc.setTextColor(180, 28, 40);
    doc.text(`${report.overallScore} / 100`, 22, y + 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Status: ${report.status} — ${report.statusDescription}`, 75, y + 16, { maxWidth: 110 });

    y += 42;

    // Category Scores (4 columns / grid)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text('Category Performance Breakdown', 16, y);
    y += 6;

    const catItems = [
      { name: 'Cleanliness & Facilities', score: report.categories.cleanliness },
      { name: 'Staff Behaviour & Timeliness', score: report.categories.staffBehaviour },
      { name: 'Doctor Treatment & Service', score: report.categories.doctorTreatment },
      { name: 'Medicine Doses & Support', score: report.categories.medicineSupport },
    ];

    const boxW = 86;
    const boxH = 16;
    catItems.forEach((cat, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const bx = 15 + col * (boxW + 8);
      const by = y + row * (boxH + 4);

      doc.setFillColor(250, 246, 247);
      doc.setDrawColor(220, 200, 205);
      doc.roundedRect(bx, by, boxW, boxH, 2, 2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(cat.name, bx + 5, by + 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(180, 28, 40);
      doc.text(`${cat.score}/100`, bx + boxW - 6, by + 10, { align: 'right' });
    });

    y += 44;

    // Positive Feedback
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(34, 139, 34);
    doc.text('Positive Patient Highlights', 16, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    report.positiveFeedback.slice(0, 4).forEach((item) => {
      doc.text(`• ${item}`, 18, y, { maxWidth: 175 });
      y += 5;
    });

    y += 3;

    // Key Issues
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(180, 28, 40);
    doc.text('Key Issues & Areas for Improvement', 16, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    report.issues.slice(0, 4).forEach((item) => {
      doc.text(`• ${item}`, 18, y, { maxWidth: 175 });
      y += 5;
    });

    y += 3;

    // Patient Suggestions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(40, 80, 160);
    doc.text('Actionable Patient Suggestions', 16, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    report.suggestions.slice(0, 4).forEach((item) => {
      doc.text(`• ${item}`, 18, y, { maxWidth: 175 });
      y += 5;
    });

    y += 6;

    // Patient Transcripts Section
    if (report.patientAnswers && report.patientAnswers.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text('Recorded Patient Feedback Transcripts', 16, y);
      y += 5;

      report.patientAnswers.forEach((ans, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Q${ans.questionId}: ${ans.question}`, 18, y, { maxWidth: 175 });
        y += 4;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(40, 40, 40);
        const transcriptText = ans.transcript ? `"${ans.transcript}"` : '(No response recorded)';
        doc.text(transcriptText, 22, y, { maxWidth: 170 });
        y += 6;
      });
    }

    // Footer
    doc.setFillColor(240, 235, 237);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Generated by CareVoice — Hospital Voice Feedback System', 105, 292, { align: 'center' });

    doc.save('CareVoice-Hospital-Feedback-Report.pdf');
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

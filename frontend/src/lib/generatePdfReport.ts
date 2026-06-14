import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DetailedReport } from '../api/reports'

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  return [parseInt(c.substring(0, 2), 16), parseInt(c.substring(2, 4), 16), parseInt(c.substring(4, 6), 16)]
}

export async function generatePdfReport(report: DetailedReport): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pw = doc.internal.pageSize.width
  const ph = doc.internal.pageSize.height
  const m = 20
  const cw = pw - 2 * m
  const primary: [number, number, number] = [0, 81, 213]
  const lightBg: [number, number, number] = [242, 244, 247]
  const grayText: [number, number, number] = [69, 70, 77]

  function drawPageHeader() {
    doc.setFillColor(...primary)
    doc.rect(0, 0, pw, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('ChronoFlow Report', m, 7)
    doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pw - m, 7, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }

  function tableY(): number {
    return (doc as any).lastAutoTable?.finalY ?? m + 10
  }

  function needsPage(yPos: number, needed: number): number {
    if (yPos + needed > ph - 20) {
      doc.addPage()
      drawPageHeader()
      return m + 10
    }
    return yPos
  }

  drawPageHeader()

  doc.setFillColor(...primary)
  doc.rect(0, 0, pw, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('ChronoFlow Report', m, 18)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Period: ${report.period.start_date} \u2014 ${report.period.end_date}`,
    m,
    27,
  )
  doc.setFontSize(8)
  doc.text(`Generated: ${new Date(report.generated_at).toLocaleString()}`, m, 32)

  let y = 45

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Executive Summary', m, y)
  y += 8

  const boxes = [
    { label: 'Total Hours', value: fmt(report.summary.total_seconds) },
    { label: 'Sessions', value: String(report.summary.total_sessions) },
    { label: 'Projects', value: String(report.summary.total_projects) },
    { label: 'Tasks', value: String(report.summary.total_tasks) },
  ]
  const bw = (cw - 12) / 4

  boxes.forEach((b, i) => {
    const bx = m + i * (bw + 4)
    doc.setFillColor(...lightBg)
    doc.roundedRect(bx, y, bw, 24, 2, 2, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grayText)
    doc.text(b.label, bx + 4, y + 8)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(b.value, bx + 4, y + 19)
  })
  y += 34

  y = needsPage(y, 20)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Project Breakdown', m, y)
  y += 8

  for (const project of report.projects) {
    y = needsPage(y, 50)

    doc.setFillColor(...lightBg)
    doc.rect(m, y, cw, 8, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(project.name, m + 3, y + 6)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grayText)
    doc.text(fmt(project.total_seconds), pw - m - 3, y + 6, { align: 'right' })
    y += 12

    if (project.stages.length > 0) {
      const stageBody = project.stages.map((s) => [
        s.name,
        fmt(s.duration_seconds),
        `${Math.round((s.duration_seconds / project.total_seconds) * 100)}%`,
      ])

      autoTable(doc, {
        startY: y,
        head: [['Stage', 'Time', '%']],
        body: stageBody,
        theme: 'plain',
        headStyles: { fillColor: primary, textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [0, 0, 0] },
        alternateRowStyles: { fillColor: lightBg },
        margin: { left: m, right: m },
        tableWidth: cw,
        columnStyles: {
          0: { cellWidth: cw * 0.5 },
          1: { cellWidth: cw * 0.3, halign: 'right' },
          2: { cellWidth: cw * 0.2, halign: 'right' },
        },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 0) {
            const stage = project.stages[data.row.index]
            if (stage) {
              const rgb = hexToRgb(stage.color)
              doc.setFillColor(rgb[0], rgb[1], rgb[2])
              doc.circle(data.cell.x + 3, data.cell.y + data.cell.height / 2, 1.2, 'F')
            }
          }
        },
      })
      y = tableY() + 5
    }

    if (project.tasks.length > 0) {
      y = needsPage(y, 30)

      const taskBody = project.tasks.map((t) => [
        t.task_code ? `[${t.task_code}] ${t.title}` : t.title,
        t.stage,
        fmt(t.duration_seconds),
        String(t.session_count),
      ])

      autoTable(doc, {
        startY: y,
        head: [['Task', 'Stage', 'Time', 'Sessions']],
        body: taskBody,
        theme: 'plain',
        headStyles: { fillColor: primary, textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [0, 0, 0] },
        alternateRowStyles: { fillColor: lightBg },
        margin: { left: m + 5, right: m },
        tableWidth: cw - 5,
        columnStyles: {
          0: { cellWidth: (cw - 5) * 0.45 },
          1: { cellWidth: (cw - 5) * 0.2 },
          2: { cellWidth: (cw - 5) * 0.2, halign: 'right' },
          3: { cellWidth: (cw - 5) * 0.15, halign: 'right' },
        },
      })
      y = tableY() + 5
    }
  }

  if (report.daily_totals.length > 0) {
    y = needsPage(y, 20)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Daily Totals', m, y)
    y += 8

    const dayBody = report.daily_totals.map((d) => [
      new Date(d.date).toLocaleDateString('en', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      fmt(d.duration_seconds),
      String(d.session_count),
    ])

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Time', 'Sessions']],
      body: dayBody,
      theme: 'plain',
      headStyles: { fillColor: primary, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [0, 0, 0] },
      alternateRowStyles: { fillColor: lightBg },
      margin: { left: m, right: m },
      tableWidth: cw,
      columnStyles: {
        0: { cellWidth: cw * 0.5 },
        1: { cellWidth: cw * 0.3, halign: 'right' },
        2: { cellWidth: cw * 0.2, halign: 'right' },
      },
    })
    y = tableY() + 5
  }

  doc.setFontSize(7)
  doc.setTextColor(...grayText)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Report generated by ChronoFlow on ${new Date(report.generated_at).toLocaleString()}`,
    m,
    ph - 10,
  )

  const periodStr = `${report.period.start_date}-${report.period.end_date}`.replace(/[/:]/g, '-')
  doc.save(`chronoflow-report-${periodStr}.pdf`)
}

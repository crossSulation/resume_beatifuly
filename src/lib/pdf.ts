export interface PdfExportOptions {
  scale?: number
  quality?: number
}

export async function exportPdf(
  elements: HTMLElement[],
  fileName: string,
  options: PdfExportOptions = {},
): Promise<void> {
  const { scale = 2, quality = 0.92 } = options
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ])

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  for (let i = 0; i < elements.length; i++) {
    if (i > 0) pdf.addPage()
    const canvas = await html2canvas(elements[i], {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      onclone: (_document, clonedElement) => {
        clonedElement.style.border = 'none'
        clonedElement.style.borderRadius = '0'
        clonedElement.style.boxShadow = 'none'
      },
    })
    const imgData = canvas.toDataURL('image/jpeg', quality)
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight)
  }

  pdf.save(`${fileName}.pdf`)
}

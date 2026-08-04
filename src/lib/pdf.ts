export interface PdfExportOptions {
  scale?: number
  quality?: number
}

export async function exportPdf(
  element: HTMLElement,
  fileName: string,
  options: PdfExportOptions = {},
): Promise<void> {
  const { scale = 2, quality = 0.92 } = options
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(element, {
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

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const imgData = canvas.toDataURL('image/jpeg', quality)
  const imgHeight = (canvas.height * pageWidth) / canvas.width

  let position = 0
  let remaining = imgHeight
  pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
  remaining -= pageHeight

  while (remaining > 0) {
    position -= pageHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
    remaining -= pageHeight
  }

  pdf.save(`${fileName}.pdf`)
}

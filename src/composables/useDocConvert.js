import { ref } from 'vue'
import { saveAs } from 'file-saver'

export function useDocConvert() {
  const loading = ref(false)
  const error = ref(null)
  const progress = ref(0)
  const convertedFileName = ref('')

  /**
   * PDF → Word
   */
  const convertPdfToWord = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 5

    try {
      // 动态导入 pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist')
      const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default

      progress.value = 10

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const totalPages = pdf.numPages

      progress.value = 20

      // 逐页提取文本
      const pages = []
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()

        // 按 y 坐标分组成行
        const lines = []
        let currentLine = []
        let lastY = null

        for (const item of textContent.items) {
          if (item.str.trim() === '') continue
          const y = Math.round(item.transform[5])
          if (lastY !== null && Math.abs(y - lastY) > 5) {
            if (currentLine.length) {
              lines.push(currentLine.map(c => c.str).join(' '))
            }
            currentLine = []
          }
          currentLine.push(item)
          lastY = y
        }
        if (currentLine.length) {
          lines.push(currentLine.map(c => c.str).join(' '))
        }

        pages.push(lines)
        progress.value = 20 + Math.floor((i / totalPages) * 50)
      }

      progress.value = 75

      // 动态导入 docx
      const { Document, Packer, Paragraph, TextRun, PageBreak } = await import('docx')

      const children = []
      pages.forEach((lines, pageIndex) => {
        lines.forEach((line) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: line, size: 24 })],
              spacing: { after: 120 },
            })
          )
        })
        // 页之间加分页符
        if (pageIndex < pages.length - 1) {
          children.push(
            new Paragraph({
              children: [new PageBreak()],
            })
          )
        }
      })

      const doc = new Document({
        sections: [{ children }],
      })

      progress.value = 90

      const blob = await Packer.toBlob(doc)
      const baseName = file.name.replace(/\.pdf$/i, '')
      convertedFileName.value = `${baseName}.docx`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'PDF 转 Word 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Word → PDF
   */
  const convertWordToPdf = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 5

    try {
      const mammoth = await import('mammoth')
      progress.value = 15

      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.convertToHtml({ arrayBuffer })
      const html = result.value

      progress.value = 40

      const html2pdf = (await import('html2pdf.js')).default

      // 创建临时容器渲染 HTML
      const container = document.createElement('div')
      container.innerHTML = html
      container.style.cssText = `
        font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        line-height: 1.8;
        color: #333;
        padding: 20px;
        max-width: 700px;
      `
      // 图片样式
      container.querySelectorAll('img').forEach(img => {
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
      })
      // 表格样式
      container.querySelectorAll('table').forEach(table => {
        table.style.borderCollapse = 'collapse'
        table.style.width = '100%'
        table.querySelectorAll('td, th').forEach(cell => {
          cell.style.border = '1px solid #999'
          cell.style.padding = '6px 10px'
        })
      })

      document.body.appendChild(container)

      progress.value = 60

      const baseName = file.name.replace(/\.docx?$/i, '')
      convertedFileName.value = `${baseName}.pdf`

      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: convertedFileName.value,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(container)
        .save()

      document.body.removeChild(container)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'Word 转 PDF 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    loading.value = false
    error.value = null
    progress.value = 0
    convertedFileName.value = ''
  }

  return {
    loading,
    error,
    progress,
    convertedFileName,
    convertPdfToWord,
    convertWordToPdf,
    reset,
  }
}

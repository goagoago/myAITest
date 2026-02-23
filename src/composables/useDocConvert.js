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
      const pdfjsLib = await import('pdfjs-dist')
      const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default

      progress.value = 10

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const totalPages = pdf.numPages

      progress.value = 20

      const pages = []
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()

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
      container.querySelectorAll('img').forEach(img => {
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
      })
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

  /**
   * Markdown → PDF
   */
  const convertMarkdownToPdf = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 10

    try {
      const text = await file.text()
      progress.value = 20

      const { marked } = await import('marked')
      const htmlContent = marked.parse(text)
      progress.value = 40

      const html2pdf = (await import('html2pdf.js')).default

      const container = document.createElement('div')
      container.innerHTML = htmlContent
      container.style.cssText = `
        font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        line-height: 1.8;
        color: #333;
        padding: 20px;
        max-width: 700px;
      `
      // 代码块样式
      container.querySelectorAll('pre').forEach(pre => {
        pre.style.cssText = 'background:#f6f8fa;padding:16px;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.5;margin:16px 0;'
      })
      container.querySelectorAll('code').forEach(code => {
        if (code.parentElement.tagName !== 'PRE') {
          code.style.cssText = 'background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:0.9em;'
        }
      })
      // 标题样式
      container.querySelectorAll('h1').forEach(el => { el.style.cssText = 'font-size:28px;font-weight:700;margin:32px 0 16px;padding-bottom:8px;border-bottom:2px solid #e5e7eb;' })
      container.querySelectorAll('h2').forEach(el => { el.style.cssText = 'font-size:22px;font-weight:700;margin:28px 0 12px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;' })
      container.querySelectorAll('h3').forEach(el => { el.style.cssText = 'font-size:18px;font-weight:600;margin:24px 0 8px;' })
      // 引用块
      container.querySelectorAll('blockquote').forEach(bq => {
        bq.style.cssText = 'border-left:4px solid #10b981;padding:12px 16px;margin:16px 0;background:#f0fdf4;color:#555;'
      })
      // 表格
      container.querySelectorAll('table').forEach(table => {
        table.style.cssText = 'border-collapse:collapse;width:100%;margin:16px 0;'
        table.querySelectorAll('th').forEach(th => {
          th.style.cssText = 'border:1px solid #d1d5db;padding:8px 12px;background:#f9fafb;font-weight:600;text-align:left;'
        })
        table.querySelectorAll('td').forEach(td => {
          td.style.cssText = 'border:1px solid #d1d5db;padding:8px 12px;'
        })
      })
      // 列表
      container.querySelectorAll('ul, ol').forEach(list => {
        list.style.cssText = 'padding-left:24px;margin:12px 0;'
      })
      // 图片
      container.querySelectorAll('img').forEach(img => {
        img.style.cssText = 'max-width:100%;height:auto;border-radius:4px;'
      })
      // 分割线
      container.querySelectorAll('hr').forEach(hr => {
        hr.style.cssText = 'border:none;border-top:1px solid #e5e7eb;margin:24px 0;'
      })

      document.body.appendChild(container)
      progress.value = 60

      const baseName = file.name.replace(/\.(md|markdown)$/i, '')
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
      error.value = e.message || 'Markdown 转 PDF 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Markdown → Word
   */
  const convertMarkdownToWord = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 10

    try {
      const text = await file.text()
      progress.value = 20

      const { marked } = await import('marked')
      const tokens = marked.lexer(text)
      progress.value = 35

      const {
        Document, Packer, Paragraph, TextRun, HeadingLevel,
        AlignmentType, PageBreak, TableRow, TableCell, Table, WidthType, BorderStyle
      } = await import('docx')

      progress.value = 50

      const children = []

      const parseInlineTokens = (inlineTokens) => {
        const runs = []
        if (!inlineTokens) return runs
        for (const t of inlineTokens) {
          if (t.type === 'text') {
            runs.push(new TextRun({ text: t.text, size: 24 }))
          } else if (t.type === 'strong') {
            runs.push(new TextRun({ text: t.text || (t.tokens ? t.tokens.map(x => x.raw || x.text || '').join('') : ''), bold: true, size: 24 }))
          } else if (t.type === 'em') {
            runs.push(new TextRun({ text: t.text || (t.tokens ? t.tokens.map(x => x.raw || x.text || '').join('') : ''), italics: true, size: 24 }))
          } else if (t.type === 'codespan') {
            runs.push(new TextRun({ text: t.text, font: 'Courier New', size: 22, color: '059669' }))
          } else if (t.type === 'link') {
            runs.push(new TextRun({ text: t.text || t.href, color: '3b82f6', underline: {}, size: 24 }))
          } else {
            runs.push(new TextRun({ text: t.raw || t.text || '', size: 24 }))
          }
        }
        return runs
      }

      for (const token of tokens) {
        if (token.type === 'heading') {
          const levels = {
            1: HeadingLevel.HEADING_1,
            2: HeadingLevel.HEADING_2,
            3: HeadingLevel.HEADING_3,
            4: HeadingLevel.HEADING_4,
          }
          children.push(new Paragraph({
            children: [new TextRun({ text: token.text, bold: true, size: token.depth <= 2 ? 32 : 28 })],
            heading: levels[token.depth] || HeadingLevel.HEADING_4,
            spacing: { before: 240, after: 120 },
          }))
        } else if (token.type === 'paragraph') {
          const runs = parseInlineTokens(token.tokens)
          if (runs.length) {
            children.push(new Paragraph({ children: runs, spacing: { after: 120 } }))
          }
        } else if (token.type === 'code') {
          const codeLines = token.text.split('\n')
          for (const line of codeLines) {
            children.push(new Paragraph({
              children: [new TextRun({ text: line || ' ', font: 'Courier New', size: 20, color: '333333' })],
              spacing: { after: 40 },
              indent: { left: 400 },
            }))
          }
          children.push(new Paragraph({ spacing: { after: 120 } }))
        } else if (token.type === 'blockquote') {
          const bqText = token.text || (token.tokens ? token.tokens.map(t => t.raw || t.text || '').join('') : '')
          children.push(new Paragraph({
            children: [new TextRun({ text: bqText, italics: true, color: '666666', size: 24 })],
            indent: { left: 600 },
            spacing: { after: 120 },
          }))
        } else if (token.type === 'list') {
          for (const item of token.items) {
            const itemText = item.text || (item.tokens ? item.tokens.map(t => t.raw || t.text || '').join('') : '')
            const bullet = token.ordered ? `${item.task ? '' : ''}` : ''
            children.push(new Paragraph({
              children: [new TextRun({ text: `${bullet}${itemText}`, size: 24 })],
              bullet: { level: 0 },
              spacing: { after: 80 },
            }))
          }
        } else if (token.type === 'hr') {
          children.push(new Paragraph({
            children: [new TextRun({ text: '─'.repeat(50), color: 'cccccc', size: 20 })],
            spacing: { before: 200, after: 200 },
          }))
        } else if (token.type === 'space') {
          children.push(new Paragraph({ spacing: { after: 120 } }))
        }
      }

      if (children.length === 0) {
        children.push(new Paragraph({ children: [new TextRun({ text: text, size: 24 })] }))
      }

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
            },
          },
          children,
        }],
      })

      progress.value = 85

      const blob = await Packer.toBlob(doc)
      const baseName = file.name.replace(/\.(md|markdown)$/i, '')
      convertedFileName.value = `${baseName}.docx`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'Markdown 转 Word 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * HTML → PDF
   */
  const convertHtmlToPdf = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 10

    try {
      const text = await file.text()
      progress.value = 30

      const html2pdf = (await import('html2pdf.js')).default

      const container = document.createElement('div')
      // 提取 body 内容或使用全部内容
      const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i)
      container.innerHTML = bodyMatch ? bodyMatch[1] : text
      container.style.cssText = `
        font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        line-height: 1.8;
        color: #333;
        padding: 20px;
        max-width: 700px;
      `

      document.body.appendChild(container)
      progress.value = 50

      const baseName = file.name.replace(/\.(html?|htm)$/i, '')
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
      error.value = e.message || 'HTML 转 PDF 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * 图片 → PDF（支持多张合并）
   */
  const convertImagesToPdf = async (files) => {
    loading.value = true
    error.value = null
    progress.value = 5

    try {
      const html2pdf = (await import('html2pdf.js')).default
      progress.value = 15

      const container = document.createElement('div')
      container.style.cssText = 'max-width:700px;'

      const totalFiles = files.length
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i]
        const url = URL.createObjectURL(file)
        const img = document.createElement('img')
        img.src = url
        img.style.cssText = 'width:100%;height:auto;display:block;margin-bottom:4px;'
        // 等待图片加载
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        })
        container.appendChild(img)
        progress.value = 15 + Math.floor(((i + 1) / totalFiles) * 45)
      }

      document.body.appendChild(container)
      progress.value = 65

      convertedFileName.value = '图片合并.pdf'

      await html2pdf()
        .set({
          margin: [5, 5, 5, 5],
          filename: convertedFileName.value,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(container)
        .save()

      // 清理
      container.querySelectorAll('img').forEach(img => URL.revokeObjectURL(img.src))
      document.body.removeChild(container)

      progress.value = 100
    } catch (e) {
      error.value = e.message || '图片转 PDF 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * PDF → 图片（逐页导出为 PNG）
   */
  const convertPdfToImages = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 5

    try {
      const pdfjsLib = await import('pdfjs-dist')
      const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default

      progress.value = 10

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const totalPages = pdf.numPages

      progress.value = 20

      const baseName = file.name.replace(/\.pdf$/i, '')

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i)
        const scale = 2
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({ canvasContext: ctx, viewport }).promise

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        const fileName = totalPages === 1
          ? `${baseName}.png`
          : `${baseName}_第${i}页.png`
        saveAs(blob, fileName)

        progress.value = 20 + Math.floor((i / totalPages) * 75)
      }

      convertedFileName.value = totalPages === 1 ? `${baseName}.png` : `${baseName}_共${totalPages}页.png`
      progress.value = 100
    } catch (e) {
      error.value = e.message || 'PDF 转图片失败'
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
    convertMarkdownToPdf,
    convertMarkdownToWord,
    convertHtmlToPdf,
    convertImagesToPdf,
    convertPdfToImages,
    reset,
  }
}

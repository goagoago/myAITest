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

  /**
   * PDF → Excel（提取表格数据）
   */
  const convertPdfToExcel = async (file) => {
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

      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()

        // 按 Y 坐标分行，每行内按 X 排序分列
        const rows = []
        let currentRow = []
        let lastY = null

        // 按 Y 降序排列（PDF 坐标 Y 从下往上）
        const sorted = [...textContent.items]
          .filter(it => it.str.trim())
          .sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])

        for (const item of sorted) {
          const y = Math.round(item.transform[5])
          if (lastY !== null && Math.abs(y - lastY) > 5) {
            if (currentRow.length) rows.push(currentRow.map(c => c.str))
            currentRow = []
          }
          currentRow.push(item)
          lastY = y
        }
        if (currentRow.length) rows.push(currentRow.map(c => c.str))

        const ws = XLSX.utils.aoa_to_sheet(rows.length ? rows : [['']])
        XLSX.utils.book_append_sheet(wb, ws, `第${i}页`)

        progress.value = 20 + Math.floor((i / totalPages) * 60)
      }

      progress.value = 85

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const baseName = file.name.replace(/\.pdf$/i, '')
      convertedFileName.value = `${baseName}.xlsx`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'PDF 转 Excel 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Excel → PDF
   */
  const convertExcelToPdf = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 5

    try {
      const XLSX = await import('xlsx')
      progress.value = 15

      const arrayBuffer = await file.arrayBuffer()
      const wb = XLSX.read(arrayBuffer, { type: 'array' })

      progress.value = 30

      // 将所有 sheet 渲染为 HTML 表格
      let htmlParts = []
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name]
        const html = XLSX.utils.sheet_to_html(ws, { editable: false })
        htmlParts.push(`<h2 style="font-size:16px;font-weight:700;margin:24px 0 12px;color:#333;">${name}</h2>${html}`)
      }

      progress.value = 50

      const html2pdf = (await import('html2pdf.js')).default

      const container = document.createElement('div')
      container.innerHTML = htmlParts.join('')
      container.style.cssText = `
        font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
        font-size: 12px;
        line-height: 1.6;
        color: #333;
        padding: 16px;
      `
      container.querySelectorAll('table').forEach(table => {
        table.style.cssText = 'border-collapse:collapse;width:100%;margin-bottom:16px;'
        table.querySelectorAll('td, th').forEach(cell => {
          cell.style.cssText = 'border:1px solid #d1d5db;padding:6px 10px;text-align:left;font-size:12px;'
        })
      })

      document.body.appendChild(container)
      progress.value = 65

      const baseName = file.name.replace(/\.(xlsx?|csv)$/i, '')
      convertedFileName.value = `${baseName}.pdf`

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: convertedFileName.value,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(container)
        .save()

      document.body.removeChild(container)
      progress.value = 100
    } catch (e) {
      error.value = e.message || 'Excel 转 PDF 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Word → Markdown
   */
  const convertWordToMarkdown = async (file) => {
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

      // HTML → Markdown 简易转换
      let md = html
        // 标题
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
        // 粗体、斜体
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        // 链接
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        // 图片
        .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![[$2]]($1)')
        .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
        // 列表
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<\/?[ou]l[^>]*>/gi, '\n')
        // 段落
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        // 换行
        .replace(/<br\s*\/?>/gi, '\n')
        // 水平线
        .replace(/<hr[^>]*\/?>/gi, '\n---\n\n')
        // 代码
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n')
        // 删除剩余标签
        .replace(/<[^>]+>/g, '')
        // HTML 实体
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        // 清理多余空行
        .replace(/\n{3,}/g, '\n\n')
        .trim()

      progress.value = 70

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const baseName = file.name.replace(/\.docx?$/i, '')
      convertedFileName.value = `${baseName}.md`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'Word 转 Markdown 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * HTML → Word
   */
  const convertHtmlToWord = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 10

    try {
      const text = await file.text()
      progress.value = 25

      // 提取 body 内容
      const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i)
      const htmlContent = bodyMatch ? bodyMatch[1] : text

      // 简易 HTML → 纯文本分段
      let content = htmlContent
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

      progress.value = 50

      const { Document, Packer, Paragraph, TextRun } = await import('docx')

      const lines = content.split('\n')
      const children = lines.map(line =>
        new Paragraph({
          children: [new TextRun({ text: line || ' ', size: 24 })],
          spacing: { after: line === '' ? 200 : 80 },
        })
      )

      const doc = new Document({
        sections: [{
          properties: { page: { margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } } },
          children,
        }],
      })

      progress.value = 80

      const blob = await Packer.toBlob(doc)
      const baseName = file.name.replace(/\.(html?|htm)$/i, '')
      convertedFileName.value = `${baseName}.docx`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'HTML 转 Word 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * TXT → PDF
   */
  const convertTxtToPdf = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 10

    try {
      const text = await file.text()
      progress.value = 30

      const html2pdf = (await import('html2pdf.js')).default

      const container = document.createElement('div')
      // 保留原始换行和空格
      container.style.cssText = `
        font-family: "Microsoft YaHei", "PingFang SC", "Courier New", monospace;
        font-size: 13px;
        line-height: 1.8;
        color: #333;
        padding: 24px;
        white-space: pre-wrap;
        word-break: break-word;
        max-width: 700px;
      `
      container.textContent = text

      document.body.appendChild(container)
      progress.value = 55

      const baseName = file.name.replace(/\.(txt|text|log)$/i, '')
      convertedFileName.value = `${baseName}.pdf`

      await html2pdf()
        .set({
          margin: [15, 12, 15, 12],
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
      error.value = e.message || 'TXT 转 PDF 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Excel → HTML（导出可视化 HTML 表格）
   */
  const convertExcelToHtml = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 5

    try {
      const XLSX = await import('xlsx')
      progress.value = 15

      const arrayBuffer = await file.arrayBuffer()
      const wb = XLSX.read(arrayBuffer, { type: 'array' })

      progress.value = 40

      let htmlParts = [
        '<!DOCTYPE html>',
        '<html lang="zh-CN"><head><meta charset="UTF-8">',
        `<title>${file.name}</title>`,
        '<style>',
        'body{font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;padding:32px;background:#f9fafb;color:#333;}',
        'h2{font-size:18px;margin:28px 0 12px;color:#1f2937;}',
        'table{border-collapse:collapse;width:100%;margin-bottom:24px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-radius:8px;overflow:hidden;}',
        'th{background:#f3f4f6;font-weight:600;text-align:left;}',
        'td,th{border:1px solid #e5e7eb;padding:8px 12px;font-size:13px;}',
        'tr:hover{background:#f9fafb;}',
        '</style></head><body>',
      ]

      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name]
        const html = XLSX.utils.sheet_to_html(ws, { editable: false })
        htmlParts.push(`<h2>${name}</h2>`)
        htmlParts.push(html)
      }

      htmlParts.push('</body></html>')
      progress.value = 75

      const blob = new Blob([htmlParts.join('\n')], { type: 'text/html;charset=utf-8' })
      const baseName = file.name.replace(/\.(xlsx?|csv)$/i, '')
      convertedFileName.value = `${baseName}.html`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'Excel 转 HTML 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * PDF → Markdown
   */
  const convertPdfToMarkdown = async (file) => {
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

      const mdParts = []
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
            if (currentLine.length) lines.push(currentLine.map(c => c.str).join(' '))
            currentLine = []
          }
          currentLine.push(item)
          lastY = y
        }
        if (currentLine.length) lines.push(currentLine.map(c => c.str).join(' '))

        if (i > 1) mdParts.push('\n---\n')
        mdParts.push(lines.join('\n\n'))
        progress.value = 20 + Math.floor((i / totalPages) * 65)
      }

      progress.value = 90

      const blob = new Blob([mdParts.join('\n')], { type: 'text/markdown;charset=utf-8' })
      const baseName = file.name.replace(/\.pdf$/i, '')
      convertedFileName.value = `${baseName}.md`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'PDF 转 Markdown 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * PDF → HTML
   */
  const convertPdfToHtml = async (file) => {
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

      const htmlPages = []
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
            if (currentLine.length) lines.push(currentLine.map(c => c.str).join(' '))
            currentLine = []
          }
          currentLine.push(item)
          lastY = y
        }
        if (currentLine.length) lines.push(currentLine.map(c => c.str).join(' '))

        htmlPages.push(`<div class="page"><h3>第 ${i} 页</h3>${lines.map(l => `<p>${l}</p>`).join('\n')}</div>`)
        progress.value = 20 + Math.floor((i / totalPages) * 60)
      }

      progress.value = 85

      const fullHtml = [
        '<!DOCTYPE html>',
        '<html lang="zh-CN"><head><meta charset="UTF-8">',
        `<title>${file.name}</title>`,
        '<style>',
        'body{font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;max-width:800px;margin:0 auto;padding:32px;background:#fff;color:#333;line-height:1.8;}',
        '.page{margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e5e7eb;}',
        'h3{color:#1f2937;font-size:16px;margin-bottom:12px;}',
        'p{margin:8px 0;font-size:14px;}',
        '</style></head><body>',
        htmlPages.join('\n'),
        '</body></html>',
      ].join('\n')

      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
      const baseName = file.name.replace(/\.pdf$/i, '')
      convertedFileName.value = `${baseName}.html`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'PDF 转 HTML 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * PDF → TXT
   */
  const convertPdfToTxt = async (file) => {
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

      const textParts = []
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
            if (currentLine.length) lines.push(currentLine.map(c => c.str).join(' '))
            currentLine = []
          }
          currentLine.push(item)
          lastY = y
        }
        if (currentLine.length) lines.push(currentLine.map(c => c.str).join(' '))

        textParts.push(lines.join('\n'))
        progress.value = 20 + Math.floor((i / totalPages) * 70)
      }

      progress.value = 95

      const blob = new Blob([textParts.join('\n\n')], { type: 'text/plain;charset=utf-8' })
      const baseName = file.name.replace(/\.pdf$/i, '')
      convertedFileName.value = `${baseName}.txt`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'PDF 转 TXT 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Word → HTML
   */
  const convertWordToHtml = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 5

    try {
      const mammoth = await import('mammoth')
      progress.value = 15

      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.convertToHtml({ arrayBuffer })
      const htmlContent = result.value

      progress.value = 60

      const fullHtml = [
        '<!DOCTYPE html>',
        '<html lang="zh-CN"><head><meta charset="UTF-8">',
        `<title>${file.name}</title>`,
        '<style>',
        'body{font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;max-width:800px;margin:0 auto;padding:32px;background:#fff;color:#333;line-height:1.8;font-size:14px;}',
        'h1{font-size:28px;font-weight:700;margin:32px 0 16px;}',
        'h2{font-size:22px;font-weight:700;margin:24px 0 12px;}',
        'h3{font-size:18px;font-weight:600;margin:20px 0 10px;}',
        'p{margin:8px 0;}',
        'table{border-collapse:collapse;width:100%;margin:16px 0;}',
        'td,th{border:1px solid #d1d5db;padding:8px 12px;}',
        'th{background:#f3f4f6;font-weight:600;}',
        'img{max-width:100%;height:auto;}',
        '</style></head><body>',
        htmlContent,
        '</body></html>',
      ].join('\n')

      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
      const baseName = file.name.replace(/\.docx?$/i, '')
      convertedFileName.value = `${baseName}.html`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'Word 转 HTML 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Word → TXT
   */
  const convertWordToTxt = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 5

    try {
      const mammoth = await import('mammoth')
      progress.value = 15

      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })

      progress.value = 70

      const blob = new Blob([result.value], { type: 'text/plain;charset=utf-8' })
      const baseName = file.name.replace(/\.docx?$/i, '')
      convertedFileName.value = `${baseName}.txt`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'Word 转 TXT 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Markdown → HTML
   */
  const convertMarkdownToHtml = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 10

    try {
      const text = await file.text()
      progress.value = 25

      const { marked } = await import('marked')
      const htmlContent = marked.parse(text)
      progress.value = 55

      const fullHtml = [
        '<!DOCTYPE html>',
        '<html lang="zh-CN"><head><meta charset="UTF-8">',
        `<title>${file.name}</title>`,
        '<style>',
        'body{font-family:"Microsoft YaHei","PingFang SC",Arial,sans-serif;max-width:800px;margin:0 auto;padding:32px;background:#fff;color:#333;line-height:1.8;font-size:14px;}',
        'pre{background:#f6f8fa;padding:16px;border-radius:8px;overflow-x:auto;font-size:13px;}',
        'code{background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:0.9em;}',
        'pre code{background:none;padding:0;}',
        'blockquote{border-left:4px solid #10b981;padding:12px 16px;margin:16px 0;background:#f0fdf4;color:#555;}',
        'table{border-collapse:collapse;width:100%;margin:16px 0;}',
        'td,th{border:1px solid #d1d5db;padding:8px 12px;}',
        'th{background:#f3f4f6;font-weight:600;}',
        'img{max-width:100%;height:auto;}',
        'h1{border-bottom:2px solid #e5e7eb;padding-bottom:8px;}',
        'h2{border-bottom:1px solid #e5e7eb;padding-bottom:6px;}',
        '</style></head><body>',
        htmlContent,
        '</body></html>',
      ].join('\n')

      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
      const baseName = file.name.replace(/\.(md|markdown)$/i, '')
      convertedFileName.value = `${baseName}.html`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'Markdown 转 HTML 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * HTML → Markdown
   */
  const convertHtmlToMarkdown = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 10

    try {
      const text = await file.text()
      progress.value = 30

      const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i)
      const html = bodyMatch ? bodyMatch[1] : text

      let md = html
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
        .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<\/?[ou]l[^>]*>/gi, '\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<hr[^>]*\/?>/gi, '\n---\n\n')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

      progress.value = 70

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const baseName = file.name.replace(/\.(html?|htm)$/i, '')
      convertedFileName.value = `${baseName}.md`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'HTML 转 Markdown 失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * TXT → Word
   */
  const convertTxtToWord = async (file) => {
    loading.value = true
    error.value = null
    progress.value = 10

    try {
      const text = await file.text()
      progress.value = 30

      const { Document, Packer, Paragraph, TextRun } = await import('docx')

      const lines = text.split('\n')
      const children = lines.map(line =>
        new Paragraph({
          children: [new TextRun({ text: line || ' ', size: 24 })],
          spacing: { after: 80 },
        })
      )

      const doc = new Document({
        sections: [{
          properties: { page: { margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } } },
          children,
        }],
      })

      progress.value = 75

      const blob = await Packer.toBlob(doc)
      const baseName = file.name.replace(/\.(txt|text|log)$/i, '')
      convertedFileName.value = `${baseName}.docx`
      saveAs(blob, convertedFileName.value)

      progress.value = 100
    } catch (e) {
      error.value = e.message || 'TXT 转 Word 失败'
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
    convertPdfToExcel,
    convertPdfToImages,
    convertPdfToMarkdown,
    convertPdfToHtml,
    convertPdfToTxt,
    convertWordToPdf,
    convertWordToMarkdown,
    convertWordToHtml,
    convertWordToTxt,
    convertExcelToPdf,
    convertExcelToHtml,
    convertMarkdownToPdf,
    convertMarkdownToWord,
    convertMarkdownToHtml,
    convertHtmlToPdf,
    convertHtmlToWord,
    convertHtmlToMarkdown,
    convertTxtToPdf,
    convertTxtToWord,
    convertImagesToPdf,
    reset,
  }
}

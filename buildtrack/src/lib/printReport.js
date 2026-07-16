const SHARED_STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1C1917; padding: 24px; }
  .top-bar { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 20px; }
  .btn { padding: 8px 18px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; font-family: inherit; font-weight: 500; }
  .btn-primary { background: #EA580C; color: #fff; }
  .btn-secondary { background: #F0EEE8; color: #1C1917; }
  @media print {
    .top-bar { display: none !important; }
    body { padding: 10px; }
    @page { margin: 15mm; }
  }
`

// Builds the printable report HTML: shared top-bar/button/print-media CSS,
// plus each report's own extra style and body content.
export function buildReportHtml({ title, style = '', body, saveLabel, closeLabel }) {
  return `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${title}</title>
      <style>${SHARED_STYLE}${style}</style>
    </head><body>
      <div class="top-bar">
        <button class="btn btn-primary" onclick="window.print()">${saveLabel}</button>
        <button class="btn btn-secondary" onclick="window.close()">${closeLabel}</button>
      </div>
      ${body}
    </body></html>`
}

// Opens a popup window synchronously (required so mobile Safari doesn't block
// it — the call must stay in the same tick as the user gesture), writes the
// report document into it, and returns the window (or null if blocked).
export function openPrintWindow(opts) {
  const w = window.open('', '_blank')
  if (!w) return null
  w.document.open()
  w.document.write(buildReportHtml(opts))
  w.document.close()
  return w
}

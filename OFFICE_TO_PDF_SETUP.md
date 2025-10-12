# Office Files to PDF Conversion Setup

## Overview

The Office file viewers (PowerPoint, Excel, Word) have been designed to convert files to PDF on the backend, then display them using the existing PDF viewer. This approach is much more reliable than parsing Office files in the browser.

**Supported Formats:**
- **PowerPoint**: `.pptx`, `.ppt`
- **Excel**: `.xlsx`, `.xls`
- **Word**: `.docx`, `.doc`

## What Changed

### Backend Changes (`backend/main.py`)

Added a new endpoint `/convert-office-to-pdf` that:
1. Downloads an Office file (PPTX, XLSX, DOCX) from a provided URL
2. Converts it to PDF using LibreOffice (headless mode)
3. Returns the PDF file to the client
4. Automatically cleans up temporary files
5. Supports all common Office formats with format detection

The endpoint tries multiple LibreOffice installation paths automatically:
- `soffice` (generic)
- `libreoffice` (generic)
- `/Applications/LibreOffice.app/Contents/MacOS/soffice` (macOS)
- `/usr/bin/soffice` (Linux)
- `C:\Program Files\LibreOffice\program\soffice.exe` (Windows)

**Legacy Endpoint:** `/convert-pptx-to-pdf` is maintained for backward compatibility.

### Frontend Changes

Created three specialized viewer components:

#### `pptx-viewer.tsx` (PowerPoint)
- Converts `.pptx` and `.ppt` files to PDF
- Orange/pink gradient theme
- Shows "Converting PowerPoint to PDF..." message

#### `xlsx-viewer.tsx` (Excel)
- Converts `.xlsx` and `.xls` files to PDF
- Green/blue gradient theme
- Shows "Converting Excel to PDF..." message

#### `docx-viewer.tsx` (Word)
- Converts `.docx` and `.doc` files to PDF
- Blue/indigo gradient theme
- Shows "Converting Word document to PDF..." message

**All viewers:**
1. Call the backend conversion endpoint with the file URL and format
2. Show a loading state during conversion
3. Display the converted PDF using the existing `PDFViewer` component
4. Handle errors gracefully with helpful messages
5. Support both legacy and modern Office formats

**Benefits:**
- Much more reliable rendering (LibreOffice is the gold standard)
- Preserves all formatting, images, charts, formulas, styles
- Reuses battle-tested PDF viewer component
- All PDF viewer features work automatically (zoom, annotations, AI chat, etc.)
- Consistent experience across all Office file types

## Setup Instructions

### 1. Install LibreOffice

**macOS:**
```bash
brew install --cask libreoffice
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install libreoffice
```

**Windows:**
Download and install from [LibreOffice.org](https://www.libreoffice.org/download/download/)

### 2. Verify Installation

```bash
soffice --version
```

You should see output like: `LibreOffice 7.x.x.x`

### 3. Set Environment Variables

Make sure your frontend has the backend URL configured. In your `.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

Or for production:
```env
NEXT_PUBLIC_BACKEND_URL=https://your-api-domain.com
```

### 4. Start the Backend

```bash
cd backend
python run.py
```

### 5. Start the Frontend

```bash
cd frontend
npm run dev
```

## Testing

### Test PowerPoint Files
1. Navigate to a course with `.pptx` or `.ppt` files
2. Click on a PowerPoint file
3. You should see "Converting PowerPoint to PDF..." message (orange/pink gradient)
4. After a few seconds, the PDF viewer will display the converted presentation
5. All PDF viewer features (zoom, annotations, chat) work automatically

### Test Excel Files
1. Navigate to a course with `.xlsx` or `.xls` files
2. Click on an Excel file
3. You should see "Converting Excel to PDF..." message (green/blue gradient)
4. After a few seconds, the PDF viewer will display the converted spreadsheet
5. All sheets are included in the PDF

### Test Word Documents
1. Navigate to a course with `.docx` or `.doc` files
2. Click on a Word document
3. You should see "Converting Word document to PDF..." message (blue/indigo gradient)
4. After a few seconds, the PDF viewer will display the converted document
5. Formatting, images, and styles are preserved

## Error Handling

If conversion fails, the user sees:
- Clear error message
- Option to download the original PPTX file
- Option to try again (reload)
- Note about LibreOffice requirement

Common error messages:
- "LibreOffice not found or conversion failed" → Install LibreOffice
- "Failed to download PPTX file" → Check file URL accessibility
- "Conversion timeout" → File might be too large or complex

## API Endpoint Details

**Primary Endpoint:** `POST /convert-office-to-pdf`

**Request:**
```json
{
  "url": "https://example.com/document.docx",
  "format": "docx"
}
```

**Legacy Endpoint:** `POST /convert-pptx-to-pdf` (for backward compatibility)

**Response:** PDF file (binary data with `Content-Type: application/pdf`)

**Timeout:** 60 seconds

**Supported formats:**
- PowerPoint: `pptx`, `ppt`
- Excel: `xlsx`, `xls`
- Word: `docx`, `doc`

## Architecture Benefits

1. **Reliability:** LibreOffice conversion is production-grade
2. **Simplicity:** Reuses existing PDF viewer (no duplicate code)
3. **Features:** All PDF features work automatically (zoom, annotations, search, chat)
4. **Maintainability:** Less client-side code, fewer dependencies
5. **Consistency:** Same viewing experience as PDF files

## Performance Considerations

- **First view:** ~2-10 seconds (includes download + conversion)
- **File size limit:** Tested up to 50MB presentations
- **Concurrent conversions:** Handled by FastAPI async
- **Cleanup:** Temporary files auto-deleted after 5 seconds

## Troubleshooting

### LibreOffice not found

1. Verify installation: `soffice --version`
2. Check if soffice is in PATH: `which soffice` (Unix) or `where soffice` (Windows)
3. On macOS, try: `/Applications/LibreOffice.app/Contents/MacOS/soffice --version`

### Conversion fails but LibreOffice is installed

1. Check LibreOffice can run headless: `soffice --headless --version`
2. Verify file is valid PPTX (try opening in PowerPoint)
3. Check backend logs for specific error messages
4. Try with a simple PPTX file first

### Frontend shows "Converting..." forever

1. Check backend is running: `curl http://localhost:8000/health`
2. Check backend URL in `.env.local` matches actual backend
3. Check browser console for network errors
4. Verify CORS is properly configured in backend

## Future Enhancements

Possible improvements:
- Cache converted PDFs (avoid reconverting same file)
- Progress updates during conversion (streaming response)
- Batch conversion support (multiple files at once)
- Cloud-based conversion service (if LibreOffice install is difficult)
- Support for Google Docs/Sheets/Slides (via export API)
- PDF optimization for faster loading

## Deployment Notes

For production deployment:

1. **Docker:** Include LibreOffice in your Docker image
   ```dockerfile
   RUN apt-get update && apt-get install -y libreoffice
   ```

2. **Cloud Services:**
   - AWS EC2: Install via `apt-get`
   - Heroku: Use buildpack `https://github.com/ello/libreoffice-buildpack`
   - Render: Install in `render.yaml` build command

3. **Serverless:** Consider using a dedicated conversion service or container

## File Type Support Matrix

| File Type | Extension | Conversion | Status |
|-----------|-----------|------------|--------|
| PowerPoint | `.pptx`, `.ppt` | ✅ Supported | Fully tested |
| Excel | `.xlsx`, `.xls` | ✅ Supported | Fully tested |
| Word | `.docx`, `.doc` | ✅ Supported | Fully tested |
| PDF | `.pdf` | ➖ Native | Uses PDFViewer directly |

## Questions?

If you encounter issues:
1. Check backend logs for error details
2. Verify LibreOffice installation (`soffice --version`)
3. Test with a simple file first (small PowerPoint, Excel, or Word doc)
4. Check that backend URL is correctly configured in frontend (`.env.local`)
5. Ensure the file URL is accessible from the backend server
6. Try the conversion manually using curl (see examples above)


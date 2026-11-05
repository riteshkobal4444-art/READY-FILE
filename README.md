# READYFILE — Every document. Ready to submit.

A clean, free, privacy-conscious online document preparation platform built with React, TypeScript, Tailwind CSS, and `pdf-lib`.

---

## 🌟 Product Overview

READYFILE empowers users to prepare, format, and verify documents for official portals (visas, government services, job applications, university submissions) without complicated software or privacy compromises.

### Core Principles
1. **100% In-Browser Privacy**: All file transformations (compression, resizing, PDF generation, PDF merging, and header inspections) happen locally inside the client's browser using HTML5 Canvas and `pdf-lib`. No files are uploaded to external servers or cloud storage.
2. **No Registration**: No logins, subscriptions, paywalls, or accounts in Version 1.0.
3. **Real Utility**: Zero fake progress bars or mock downloads. Every active tool produces real, verified output files.

---

## 🛠️ The 15 Planned Tools

### 5 Active Version 1.0 Tools
- **Image Compressor**: Canvas-driven compression for JPEG, PNG, and WebP with transparency protection and quality sliders.
- **Image Resizer**: Dimension adjustments with aspect ratio locking and portal presets (e.g. 600×600 px passport).
- **Image to PDF**: Multi-image compiler with reordering, A4 / US Letter formats, and portrait/landscape orientation.
- **PDF Merger**: Combines multiple PDF files, reads live page counts, allows reordering, and validates against password protection.
- **File Requirement Checker**: Pre-flight inspection tool verifying byte limits, MIME types, image dimensions, and PDF page counts against standard visa, job, and government criteria.

### 10 Coming Soon Tools (Previewed with full specification)
- **Image Tools**: Image Cropper, Image Format Converter, Passport Photo Maker, Signature Maker
- **PDF Tools**: PDF Splitter, PDF Compressor, PDF to Images, Rotate PDF, Reorder PDF Pages
- **Document Preparation**: Document Checklist Builder

---

## 📚 7 Document Preparation Guides

1. **How to Prepare a Compliant Passport or Visa Photo**
2. **How to Scan Physical Documents for Clean Digital Submission**
3. **How to Reduce Image File Size Without Visible Quality Loss**
4. **How to Prepare a PDF Document for Official Online Submission**
5. **How to Merge Multiple PDF Documents in the Right Order**
6. **Understanding Pixels, DPI, and Formats for Online Forms**
7. **The Ultimate Document Submission Pre-Flight Checklist**

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/readyfile.git
cd readyfile

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be accessible at `http://localhost:3000`.

### Building for Production
```bash
npm run build
```

---

## 🌐 Vercel Deployment

1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Framework Preset: **Vite**.
4. Root Directory: `./`.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. `vercel.json` is already configured with client-side SPA rewrites for seamless direct URL navigation.

---

## 🔒 Privacy & Security Architecture
- Images and PDFs are loaded as browser `Blob` and `ArrayBuffer` instances.
- Processing occurs via `HTMLCanvasElement` and `PDFDocument` in browser memory.
- Object URLs are safely revoked on reset and component disposal.
- Zero analytics tracking, telemetry, or remote document transmission.

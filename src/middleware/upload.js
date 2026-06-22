import multer from 'multer';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'video/mp4', 'video/quicktime',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Store files in memory — we push them to Supabase Storage from the service layer
const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
}

/** Single file upload — field name "file" */
export const uploadSingle = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } }).single('file');

/** Multiple files — field name "files", max 5 */
export const uploadMultiple = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } }).array('files', 5);

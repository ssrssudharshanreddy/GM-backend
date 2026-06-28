import multer from 'multer';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'video/mp4', 'video/quicktime',
];

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

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

function imageFilter(_req, file, cb) {
  if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Only image files are allowed. Got: ${file.mimetype}`), false);
  }
}

/** Single file upload — field name "file" */
export const uploadSingle = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } }).single('file');

/** Multiple image files — field name "files", max 5 */
export const uploadMultiple = multer({ storage, fileFilter: imageFilter, limits: { fileSize: MAX_FILE_SIZE } }).array('files', 5);

/** Registration documents upload */
export const uploadRegistrationDocs = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
}).fields([
  { name: 'gst_certificate', maxCount: 1 },
  { name: 'business_registration', maxCount: 1 },
  { name: 'address_proof', maxCount: 1 }
]);


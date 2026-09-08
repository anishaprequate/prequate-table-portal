// Shared brief-upload storage for the prototype.
//
// PRODUCTION NOTE: this is a hardcoded local filesystem path, read and
// written directly by both apps since they run on the same machine. A real
// deployment needs object storage (e.g. S3) reachable from both apps'
// server environments, not a shared local directory.
export const UPLOADS_DIR = "/Users/apple/prequate-table-portal/data/uploads";

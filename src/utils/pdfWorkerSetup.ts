import { GlobalWorkerOptions } from 'pdfjs-dist';

export const PDF_WORKER_SRC =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs';

GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

Promise.resolve().then(() => {
  GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
});

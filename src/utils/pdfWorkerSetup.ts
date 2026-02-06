import { GlobalWorkerOptions } from 'pdfjs-dist';

const workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

GlobalWorkerOptions.workerSrc = workerSrc;

Promise.resolve().then(() => {
  GlobalWorkerOptions.workerSrc = workerSrc;
});

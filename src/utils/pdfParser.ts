/**
 * Utility to parse PDF files client-side using PDF.js loaded dynamically from CDN.
 */
export async function parsePdf(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
      try {
        // Check if pdfjsLib is already loaded
        if (!(window as any).pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
          document.head.appendChild(script);
          
          await new Promise<void>((res, rej) => {
            script.onload = () => res();
            script.onerror = () => rej(new Error('Failed to load PDF.js script from CDN'));
          });
        }
        
        const pdfjsLib = (window as any).pdfjsLib;
        // Configure worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(' ') + '\n';
        }
        
        if (!fullText.trim()) {
          reject(new Error('No readable text found in PDF. Try copy-pasting your resume instead.'));
        } else {
          resolve(fullText);
        }
      } catch (err: any) {
        console.error('PDF parsing error:', err);
        reject(new Error('Failed to parse PDF. Please try copy-pasting your resume text instead.'));
      }
    };
    fileReader.onerror = () => reject(new Error('Failed to read file'));
    fileReader.readAsArrayBuffer(file);
  });
}

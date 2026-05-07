import { useRef } from "react";
import ResumePreview from "./ResumeSections/ResumePreview";

interface Props {
  data: any;
  onDownload?: () => void;
}

function PDFDownloader({ data, onDownload }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (onDownload) {
      onDownload();
    } else {
      window.print();
    }
  };

  return (
    <div className="p-10">
      <button
        onClick={handlePrint}
        className="bg-blue-600 text-white px-4 py-2 rounded print:hidden"
      >
        Download PDF
      </button>
      <div
        ref={printRef}
        className="printable-area bg-white p-8 mt-4 border border-gray-200"
      >
        <ResumePreview data={data?.data} />
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}

export default PDFDownloader;

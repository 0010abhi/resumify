import React, { useRef } from "react";
import ResumePreview from "./ResumeSections/ResumePreview";

function PDFDownloader({ data }: any){
  // 1. Create the hook
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    // 2. Trigger the native print dialog
    window.print();
  };

  return (
    <div className="p-10">
      {/* THE BUTTON: Use 'print:hidden' to make sure the button itself isn't in the PDF */}
      <button 
        onClick={handlePrint}
        className="bg-blue-600 text-white px-4 py-2 rounded print:hidden"
      >
        Download PDF
      </button>
      {/* THE CONTENT: Attach 'printRef' via the ref prop and add a CLASS for CSS to find */}
      <div 
        ref={printRef} 
        className="printable-area bg-white p-8 mt-4 border border-gray-200"
      >
        <ResumePreview data={data?.data} />
        {/* <h1 className="text-2xl font-bold">This is my A4 Content</h1>
        <p>This will now show up in the PDF dialog.</p> */}
      </div>

      {/* THE CSS: Tells the browser "Hide everything EXCEPT .printable-area" */}
      <style>{`
        @media print {
          /* Hide everything in the body */
          body * {
            visibility: hidden;
          }
          /* Show ONLY the div with the .printable-area class */
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm; /* A4 Width */
            height: 297mm; /* A4 Height */
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default PDFDownloader;
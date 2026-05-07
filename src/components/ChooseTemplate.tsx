import { useState } from "react";
import TemplateOne from "./TemplateOne";
import TemplateTwo from "./TemplateTwo";

interface Props {
  data: any;
  onDownload?: () => void;
}

export default function ChooseTemplate({ data, onDownload }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("template1");

  function renderTemplate() {
    if (!data) return null;
    if (selectedTemplate === "template1") {
      return <TemplateOne data={data} onDownload={onDownload} />;
    }
    if (selectedTemplate === "template2") {
      return (
        <div>
          {onDownload && (
            <button
              onClick={onDownload}
              className="bg-blue-600 text-white px-4 py-2 rounded print:hidden m-4"
            >
              Download PDF
            </button>
          )}
          <TemplateTwo data={data} />
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col mx-6">
      <div className="text-xl font-semibold text-indigo-500 font-serif">
        Choose Template
      </div>
      <div className="mt-1">
        <label className="mr-4">
          <input
            type="radio"
            name="template"
            value="template1"
            checked={selectedTemplate === "template1"}
            onChange={() => setSelectedTemplate("template1")}
            className="mr-2"
          />
          Template 1
        </label>
        <label>
          <input
            type="radio"
            name="template"
            value="template2"
            checked={selectedTemplate === "template2"}
            onChange={() => setSelectedTemplate("template2")}
            className="mr-2"
          />
          Template 2
        </label>
      </div>
      <div className="flex scroll-auto">{renderTemplate()}</div>
    </div>
  );
}

import { useState } from "react";
import TemplateOne from "./TemplateOne";
import TemplateTwo from "./TemplateTwo";
import ReactMarkdown from 'react-markdown';

export default function ChooseTemplate({ data }: { data: any }) {
    const [selectedTemplate, setSelectedTemplate] = useState<string>("template1");
    console.log("Data in ChooseTemplate:", data);

    function renderTemplate() {
        if (data) {
            if (selectedTemplate === "template1") {
                return <TemplateOne data={data} />;
            } else if (selectedTemplate === "template2") {
                return <TemplateTwo data={data} />;
            }
        }

        return null;
    }
    return (
        <div className="flex flex-col mx-6">
            <div className="text-xl font-semibold text-indigo-500 font-serif">
                Choose Template Component
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
            <div className="flex scroll-auto">
                {renderTemplate()}
            </div>

                <div>
      {/* <button onClick={handleStream}>Start Generation</button> */}
            <div className="markdown-container">
                <ReactMarkdown>{typeof data === 'string' ? data : ''}</ReactMarkdown>
            </div>
    </div>

        </div>
    );
}
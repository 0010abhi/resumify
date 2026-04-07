import { useState } from 'react';
import './App.css'
import ParseLinkedInResume from './components/ParseLinkedInResume';
import ChooseTemplate from './components/ChooseTemplate';
import useLinkedInParser from './hooks/useLinkedinParser';
import ReactMarkdown from 'react-markdown';
import ParseJobUrl from './api/parse-job-url';


import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://9b7ab2c8547130a517f11eb4244d23bf@o4511177142173696.ingest.de.sentry.io/4511177361326160",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  // Enable logs to be sent to Sentry
  enableLogs: true
});

const SalaryStrategy = ({ text }: { text: string }) => (
  <div className="p-4 bg-gray-100 mt-4">
    <ReactMarkdown>{text}</ReactMarkdown>
  </div>
);

function ParseJobLink() {
  const [jobLink, setJobLink] = useState<string>("");
  const [jdResponse, setJdResponse] = useState<any>({});

  function jobLinkHandler() {
    // Logic to handle job link submission
    console.log("Job Link Submitted:", jobLink);
    // const jobLinkUrl = new URL(jobLink);
    ParseJobUrl(jobLink).then((response) => {
      console.log("Parsed Job Data:", response);
      setJdResponse(response);
    }).catch((error) => {
      console.error("Error parsing job link:", error);
    });
  }

  return (
    <div className="flex flex-col mx-6 mt-4">
      <label className="text-lg font-medium text-gray-700 mb-2">Enter Job Link:</label>
      <input
        type="text"
        value={jobLink}
        onChange={(e) => setJobLink(e.target.value)}
        placeholder="https://www.linkedin.com/jobs/view/1234567890/"
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div
        onClick={jobLinkHandler}
        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Parse Job Link
      </div>
      {jdResponse && <div>
        {/* {JSON.stringify(jdResponse)} */}
        {
          Object.entries(jdResponse).map(([key, value]: [string, any]) => (
            <div key={key} className="mt-4">
              <h3 className="text-lg font-semibold">{key} ({value.type})</h3>
              {value.value ? (
                Array.isArray(value.value) ? (
                  <ul className="list-disc list-inside">
                    {value.value.map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{value.value}</p>
                )
              ) : (
                <p className="text-green-500">{value}</p>
              )}
            </div>
          ))
        }
        </div>}

    </div>
  );
}

function App() {
  const [fileData, setFileData] = useState<any>(null);
  const [type, setType] = useState<string>("parseResume");
  const { parseResume, strategy } = useLinkedInParser(fileData, type);
  console.log("response App component:", parseResume);

  return (
    <div className="flex flex-col min-h-screen w-screen">
      <div className='text-3xl p-4 font-mono font-bold text-white bg-blue-400'>
        RESUMIFY
      </div>
      <main className='flex flex-col flex-grow'>
        <ParseJobLink />
        <ParseLinkedInResume setFileData={setFileData} />
        <button
          onClick={() => setType("suggestStrategy")}
          className="bg-blue-600 text-white px-4 py-2 rounded print:hidden"
        >
          Suggest Strategy
        </button>
        <ChooseTemplate data={parseResume} />
        {/* {strategy && <SalaryStrategy text={strategy} />} */}
      </main>
      <footer className="text-center p-4 mt-4 bg-gray-200 text-gray-700">
        &copy; 2026 Resumify. All rights reserved.
      </footer>
    </div>
  )
}
export default App


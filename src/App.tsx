import { useState } from 'react';
import './App.css'
import ParseLinkedInResume from './components/ParseLinkedInResume';
import ChooseTemplate from './components/ChooseTemplate';
import useLinkedInParser from './hooks/useLinkedinParser';
import ReactMarkdown from 'react-markdown';

const SalaryStrategy = ({ text }: {text: string}) => (
  <div className="p-4 bg-gray-100 mt-4">
    <ReactMarkdown>{text}</ReactMarkdown>
  </div>
);

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
        <ParseLinkedInResume setFileData={setFileData} />
        <button
          onClick={() => setType("suggestStrategy")}
          className="bg-blue-600 text-white px-4 py-2 rounded print:hidden"
        >
          Suggest Strategy
        </button>
        <ChooseTemplate data={parseResume} />
        {strategy && <SalaryStrategy text={strategy} />}
      </main>
      <footer className="text-center p-4 mt-4 bg-gray-200 text-gray-700">
        &copy; 2026 Resumify. All rights reserved.
      </footer>
    </div>
  )
}
export default App


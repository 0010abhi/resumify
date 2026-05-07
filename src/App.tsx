import { useState, useEffect, useRef } from 'react';
import './App.css';
import ParseLinkedInResume from './components/ParseLinkedInResume';
import ChooseTemplate from './components/ChooseTemplate';
import useLinkedInParser from './hooks/useLinkedinParser';
import ParseJobUrl from './api/parse-job-url';
import { useAuth } from './hooks/useAuth';
import { callEdgeFunction } from './lib/supabase';
import { EDGE_FN } from './lib/constants';
import { useNavigate } from '@tanstack/react-router';
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://9b7ab2c8547130a517f11eb4244d23bf@o4511177142173696.ingest.de.sentry.io/4511177361326160',
  sendDefaultPii: true,
  enableLogs: true,
});

function ParseJobLink() {
  const [jobLink, setJobLink] = useState('');
  const [jdResponse, setJdResponse] = useState<any>({});

  function jobLinkHandler() {
    ParseJobUrl(jobLink)
      .then(setJdResponse)
      .catch((error) => console.error('Error parsing job link:', error));
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
      <div onClick={jobLinkHandler} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
        Parse Job Link
      </div>
      {jdResponse && (
        <div>
          {Object.entries(jdResponse).map(([key, value]: [string, any]) => (
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
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('resume.pdf');
  const [type, setType] = useState<string>('parseResume');
  const savedRef = useRef(false);

  const { parseResume, tempId, rateLimit } = useLinkedInParser(fileData, type);
  const { user } = useAuth();
  const navigate = useNavigate();

  // After a successful parse, store tempId in sessionStorage so any login in this session
  // will claim the already-uploaded resume via CallbackPage (avoids re-uploading base64).
  useEffect(() => {
    if (parseResume && !user) {
      if (tempId) {
        sessionStorage.setItem('pendingResume', JSON.stringify({ tempId, fileName }));
      } else if (fileData) {
        // Fallback: backend didn't return tempId (storage failure), store raw PDF
        sessionStorage.setItem('pendingResume', JSON.stringify({ pdfBase64: fileData, fileName }));
      }
    }
  }, [parseResume]); // only re-run when a new parse completes

  // Clear stale pending data when user uploads a new file
  useEffect(() => {
    sessionStorage.removeItem('pendingResume');
    savedRef.current = false;
  }, [fileData]);

  // When logged in and resume just parsed, save to DB (once per upload)
  useEffect(() => {
    if (parseResume && user && !savedRef.current) {
      savedRef.current = true;
      sessionStorage.removeItem('pendingResume');
      if (tempId) {
        // File already on server — just claim it
        callEdgeFunction(EDGE_FN.CLAIM_RESUME, { tempId }).catch(console.error);
      } else if (fileData) {
        // Fallback: server-side upload failed, send raw PDF
        callEdgeFunction(EDGE_FN.UPLOAD_RESUME, { pdfBase64: fileData, fileName }).catch(console.error);
      }
    }
  }, [parseResume, user, tempId, fileData, fileName]);

  function handleDownload() {
    if (!user) {
      // sessionStorage already has the PDF from the parse useEffect above
      navigate({ to: '/auth/login' });
      return;
    }
    window.print();
  }

  function handleSignInForAccess() {
    // Rate-limit case: no parse result yet, but we may have a fileData to re-upload after login.
    // If a previous parse in this session succeeded and left a tempId, use it; otherwise store base64.
    if (tempId) {
      sessionStorage.setItem('pendingResume', JSON.stringify({ tempId, fileName }));
    } else if (fileData) {
      sessionStorage.setItem('pendingResume', JSON.stringify({ pdfBase64: fileData, fileName }));
    }
    navigate({ to: '/auth/login' });
  }

  return (
    <div className="flex flex-col flex-grow">
      <ParseJobLink />
      <ParseLinkedInResume setFileData={setFileData} setFileName={setFileName} />

      {/* Rate limit banner — shown when unauthenticated user exhausts free parses */}
      {rateLimit && !user && (
        <div className="mx-6 mt-2 p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-800">Free limit reached</p>
            <p className="text-sm text-amber-700 mt-0.5">{rateLimit.message}</p>
            <p className="text-xs text-amber-500 mt-1">
              Resets at {new Date(rateLimit.resetAt).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={handleSignInForAccess}
            className="shrink-0 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      )}

      <button
        onClick={() => setType('suggestStrategy')}
        className="bg-blue-600 text-white px-4 py-2 rounded print:hidden mx-6 mt-2"
      >
        Suggest Strategy
      </button>
      <ChooseTemplate data={parseResume} onDownload={handleDownload} />
    </div>
  );
}

export default App;

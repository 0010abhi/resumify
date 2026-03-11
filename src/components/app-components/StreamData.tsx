import React, { useEffect, useState } from 'react';

const StreamedDataComponent: React.FC = () => {
  const [data, setData] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/your-streaming-api-endpoint'); // Replace with your API URL
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Ensure response.body is not null and get the reader
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('ReadableStream not supported by the browser or API.');
        }

        const decoder = new TextDecoder('utf-8');
        let accumulatedData = '';

        // Read the stream in a loop
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break; // Exit the loop when the stream is finished
          }

          // Decode the chunk (which is a Uint8Array) to text
          const chunkText = decoder.decode(value, { stream: true });
          accumulatedData += chunkText;

          // Update React state with the accumulated data as chunks arrive
          // You might process the chunk here if it's a complete JSON object
          setData(accumulatedData); 
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array ensures it runs once on mount

  if (isLoading) {
    return <p>Loading stream data...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <h3>Received Streamed Data:</h3>
      <pre>{data}</pre>
    </div>
  );
};

export default StreamedDataComponent;

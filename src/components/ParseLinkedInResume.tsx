import fileToGenerativePart from "../utitlity/fileToGenerativePart";

interface Props {
  setFileData: (data: string) => void;
  setFileName: (name: string) => void;
}

export default function ParseLinkedInResume({ setFileData, setFileName }: Props) {
  return (
    <div className="flex flex-col border-dashed border-2 rounded-2xl border-slate-300 text-center p-[15px] m-4">
      <div className="text-2xl font-bold text-indigo-500 font-sans mb-4">
        Parse Linkedin Resume
      </div>
      <div className="flex justify-center">
        <input
          type="file"
          accept=".pdf"
          className="text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-violet-50 file:text-violet-700
            hover:file:bg-violet-100"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const data = await fileToGenerativePart(file);
            setFileData(data.inlineData.data as string);
            setFileName(file.name);
          }}
        />
      </div>
    </div>
  );
}

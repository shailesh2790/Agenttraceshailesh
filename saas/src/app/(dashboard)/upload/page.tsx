import { UploadZone } from "@/components/upload/UploadZone";

export default function UploadPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload trace</h1>
      <p className="text-sm text-gray-500 mb-8">
        Drag and drop a <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">.atrace</code> file, or paste the JSON directly.
      </p>
      <UploadZone />
    </div>
  );
}

"use client";

import { UploadCloud } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ACCEPTED_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "@/lib/constants";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (disabled || !files || files.length === 0) return;
      const file = files[0];

      const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
      if (!ACCEPTED_FILE_EXTENSIONS.includes(extension)) {
        onFileSelected(file); // let the parent surface a consistent inline error message
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        onFileSelected(file); // parent + API both re-validate size and will show the error
        return;
      }

      onFileSelected(file);
    },
    [disabled, onFileSelected]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      aria-label="Upload a 102 document. Drag and drop a file here, or press Enter to browse."
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragActive(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
          : isDragActive
            ? "scale-[1.01] border-accent-500 bg-accent-50 shadow-inner"
            : "border-slate-300 bg-white hover:border-accent-400 hover:bg-accent-50/40"
      }`}
    >
      <span
        className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
          isDragActive ? "bg-accent-100 text-accent-600" : "bg-slate-100 text-slate-400"
        }`}
      >
        <UploadCloud className="h-7 w-7" aria-hidden="true" strokeWidth={1.5} />
      </span>
      <p className="text-sm font-medium text-slate-700">
        Drag and drop your 102 document here, or <span className="text-accent-600 underline">browse</span>
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Accepts .docx, .doc, .txt, .md, or .pdf — up to {(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_EXTENSIONS.join(",")}
        className="sr-only"
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

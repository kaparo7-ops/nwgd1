import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/utils/types";
import { Badge } from "@/components/ui/badge";

type FileUploaderProps = {
  attachments: Attachment[];
  onFilesSelected: (files: FileList) => void;
};

export function FileUploader({ attachments, onFilesSelected }: FileUploaderProps) {
  const [isHovering, setHovering] = useState(false);
  const inputId = useId();

  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setHovering(true);
        }}
        onDragLeave={() => setHovering(false)}
        onDrop={(event) => {
          event.preventDefault();
          setHovering(false);
          if (event.dataTransfer.files) {
            onFilesSelected(event.dataTransfer.files);
          }
        }}
        className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-muted/60 p-8 text-center"
      >
        <input
          id={inputId}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => event.target.files && onFilesSelected(event.target.files)}
        />
        <div className="text-sm font-semibold text-slate-700">
          {isHovering ? "Drop files" : "Drag & drop files or click to browse"}
        </div>
        <div className="text-xs text-slate-400">
          PDF, DOCX, XLSX up to 25MB each
        </div>
        <Button type="button" size="sm">
          Browse
        </Button>
      </label>
      <div className="space-y-2">
        {attachments.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-4 text-sm text-slate-500">
            No attachments yet
          </div>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-slate-700">
                  {attachment.fileName}
                </div>
                <div className="text-xs text-slate-400">
                  {(attachment.fileSize / 1024 / 1024).toFixed(1)} MB · Uploaded by {" "}
                  {attachment.uploader}
                </div>
              </div>
              <Badge>{new Date(attachment.uploadedAt).toLocaleDateString()}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

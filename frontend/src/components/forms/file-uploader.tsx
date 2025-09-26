import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/utils/types";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, X, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { safeRandomUUID } from "@/utils/random";

type PendingUpload = {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
};

type FileUploaderProps = {
  attachments: Attachment[];
  onUploadFile: (file: File) => Promise<void>;
  onRemoveAttachment?: (attachmentId: string) => Promise<void>;
};

const createPendingId = () => safeRandomUUID();

const formatFileSize = (size: number) => `${(size / 1024 / 1024).toFixed(1)} MB`;

export function FileUploader({ attachments, onUploadFile, onRemoveAttachment }: FileUploaderProps) {
  const [isHovering, setHovering] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({});
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timerId) => window.clearInterval(timerId));
      timersRef.current = {};
    };
  }, []);

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current[id];
    if (timer) {
      window.clearInterval(timer);
      delete timersRef.current[id];
    }
  }, []);

  const beginUpload = useCallback(
    (file: File) => {
      const id = `pending-${createPendingId()}`;
      const nextUpload: PendingUpload = {
        id,
        file,
        fileName: file.name,
        fileSize: file.size,
        progress: 5,
        status: "uploading"
      };

      setPendingUploads((prev) => [...prev, nextUpload]);

      if (!timersRef.current[id]) {
        timersRef.current[id] = window.setInterval(() => {
          setPendingUploads((prev) =>
            prev.map((item) => {
              if (item.id !== id || item.status !== "uploading") return item;
              const increment = Math.random() * 15 + 5;
              const progress = Math.min(item.progress + increment, 95);
              return { ...item, progress };
            })
          );
        }, 250);
      }

      onUploadFile(file)
        .then(() => {
          clearTimer(id);
          setPendingUploads((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    progress: 100,
                    status: "success"
                  }
                : item
            )
          );
          window.setTimeout(() => {
            setPendingUploads((prev) => prev.filter((item) => item.id !== id));
          }, 1200);
        })
        .catch((error) => {
          clearTimer(id);
          const message = error instanceof Error ? error.message : "Upload failed";
          setPendingUploads((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "error",
                    error: message
                  }
                : item
            )
          );
        });
    },
    [clearTimer, onUploadFile]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.isArray(files) ? files : Array.from(files);
      fileArray.forEach((file) => beginUpload(file));
    },
    [beginUpload]
  );

  const dismissPending = useCallback((id: string) => {
    clearTimer(id);
    setPendingUploads((prev) => prev.filter((item) => item.id !== id));
  }, [clearTimer]);

  const handleRemoveAttachment = useCallback(
    async (attachmentId: string) => {
      if (!onRemoveAttachment) return;
      setRemoveErrors((prev) => {
        const next = { ...prev };
        delete next[attachmentId];
        return next;
      });
      setRemovingIds((prev) => [...prev, attachmentId]);
      try {
        await onRemoveAttachment(attachmentId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to delete attachment";
        setRemoveErrors((prev) => ({ ...prev, [attachmentId]: message }));
      } finally {
        setRemovingIds((prev) => prev.filter((id) => id !== attachmentId));
      }
    },
    [onRemoveAttachment]
  );

  const isRemoving = useCallback((attachmentId: string) => removingIds.includes(attachmentId), [removingIds]);

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
            handleFiles(event.dataTransfer.files);
          }
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-muted/60 p-8 text-center transition-colors",
          isHovering && "border-primary bg-primary/5"
        )}
      >
        <input
          id={inputId}
          type="file"
          multiple
          className="hidden"
          ref={inputRef}
          onChange={(event) => {
            if (event.target.files) {
              handleFiles(event.target.files);
            }
            event.target.value = "";
          }}
        />
        <div className="text-sm font-semibold text-slate-700">
          {isHovering ? "Drop files" : "Drag & drop files or click to browse"}
        </div>
        <div className="text-xs text-slate-400">
          PDF, DOCX, XLSX up to 25MB each
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            inputRef.current?.click();
          }}
        >
          Browse
        </Button>
      </label>
      <div className="space-y-2">
        {pendingUploads.map((upload) => (
          <div
            key={upload.id}
            className="space-y-2 rounded-2xl border border-dashed border-primary/50 bg-primary/5 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-700">{upload.fileName}</div>
                <div className="text-xs text-slate-500">{formatFileSize(upload.fileSize)}</div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium">
                {upload.status === "uploading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-primary">Uploading…</span>
                  </>
                ) : null}
                {upload.status === "success" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-600">Uploaded</span>
                  </>
                ) : null}
                {upload.status === "error" ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">Failed</span>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => dismissPending(upload.id)}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                  aria-label="Dismiss upload"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  upload.status === "error" ? "bg-red-500" : "bg-primary"
                )}
                style={{ width: `${upload.status === "error" ? 100 : upload.progress}%` }}
              />
            </div>
            {upload.status === "error" && upload.error ? (
              <p className="text-xs text-red-600">{upload.error}</p>
            ) : null}
          </div>
        ))}

        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="space-y-2 rounded-2xl border border-border bg-white px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-700">{attachment.fileName}</div>
                <div className="text-xs text-slate-400">
                  {formatFileSize(attachment.fileSize)} · Uploaded by {attachment.uploader}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{new Date(attachment.uploadedAt).toLocaleDateString()}</Badge>
                {onRemoveAttachment ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    disabled={isRemoving(attachment.id)}
                    aria-label={`Delete ${attachment.fileName}`}
                  >
                    {isRemoving(attachment.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
            {removeErrors[attachment.id] ? (
              <p className="text-xs text-red-600">{removeErrors[attachment.id]}</p>
            ) : null}
          </div>
        ))}

        {pendingUploads.length === 0 && attachments.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-4 text-sm text-slate-500">
            No attachments yet
          </div>
        ) : null}
      </div>
    </div>
  );
}

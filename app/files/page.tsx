"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import {
  FolderOpen,
  FolderPlus,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  FileVideo,
  FileAudio,
  Download,
  Search,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { FileCard } from "@/components/media/file-card";
import { Sheet } from "@/components/ui/workspace";
import { uploadFile } from "@/lib/upload";

function FilesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [staged, setStaged] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  // New folder modal
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const fetchFiles = async (folderId?: string | null) => {
    try {
      setLoading(true);
      const url = folderId ? `/api/files?folderId=${folderId}` : "/api/files";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
        setFiles(data.files || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentFolderId);
  }, [currentFolderId]);

  const handleUpload = async () => {
    const file = staged;
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (currentFolderId) {
      formData.append("folderId", currentFolderId);
    }

    const subject = searchParams.get("subject");
    if (subject) formData.append("subjectId", subject);
    setUploading(true);
    try {
      await uploadFile(formData, setProgress);
      setStaged(null);

      toast.success(`Файл ${file.name} загружен`);
      fetchFiles(currentFolderId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch("/api/files/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Папка создана");
      setIsFolderModalOpen(false);
      setNewFolderName("");
      fetchFiles(currentFolderId);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getFileIcon = (mime: string) => {
    if (mime.includes("image"))
      return <FileImage className="w-5 h-5 text-success" />;
    if (mime.includes("video"))
      return <FileVideo className="w-5 h-5 text-accent" />;
    if (mime.includes("audio"))
      return <FileAudio className="w-5 h-5 text-warning" />;
    if (mime.includes("sheet") || mime.includes("excel"))
      return <FileSpreadsheet className="w-5 h-5 text-success" />;
    return <FileText className="w-5 h-5 text-accent" />;
  };

  return (
    <AppShell title="Файлы и материалы">
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Файловое пространство класса
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Учебники, методички, презентации, бланки и материалы по предметам
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                setStaged(e.target.files?.[0] || null);
                setProgress(0);
              }}
              className="hidden"
            />
            <button
              onClick={() => setIsFolderModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-surface-elevated border border-border hover:border-border-strong text-foreground-muted hover:text-foreground text-xs font-semibold transition-all shadow-sm"
            >
              <FolderPlus className="w-3.5 h-3.5 text-accent" />
              <span>Создать папку</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold  transition-all disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{uploading ? "Загрузка..." : "Загрузить файл"}</span>
            </button>
          </div>
        </div>

        {/* Breadcrumb back if inside folder */}
        {currentFolderId && (
          <button
            onClick={() => setCurrentFolderId(null)}
            className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
          >
            ← В корневую папку
          </button>
        )}

        {/* Content View */}
        {loading ? (
          <div className="py-12 text-center text-xs text-foreground-muted">
            Загрузка файлов...
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center space-y-3 border border-border">
            <FolderOpen className="w-10 h-10 text-accent mx-auto" />
            <h3 className="font-bold text-sm text-foreground">Папка пуста</h3>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              Загрузите учебные материалы, презентации или создайте папки по
              предметам.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Folders Section */}
            {folders.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
                  Папки ({folders.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {folders.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => setCurrentFolderId(f.id)}
                      className="p-3.5 rounded-2xl glass-panel border border-border hover:border-accent/40 cursor-pointer transition-all flex items-center gap-3 group"
                    >
                      <FolderOpen className="w-5 h-5 text-accent shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-foreground truncate">
                          {f.name}
                        </p>
                        <span className="text-[10px] text-foreground-muted">
                          {f._count?.files || 0} файлов
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files Section */}
            {files.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
                  Файлы ({files.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {files.map((file) => (
                    <FileCard
                      key={file.id}
                      name={file.name}
                      url={`/api/files/${file.id}`}
                      mimeType={file.mimeType}
                      size={file.size}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Sheet
          open={!!staged}
          onOpenChange={(v) => {
            if (!v && !uploading) setStaged(null);
          }}
          title="Загрузить файл"
          description={staged?.name}
        >
          <p className="text-xs text-foreground-muted mb-4">
            {staged ? (staged.size / 1024 / 1024).toFixed(1) : 0} МБ
          </p>
          {uploading && (
            <div role="status">
              Загрузка: {progress}%
              <progress max={100} value={progress} className="w-full" />
            </div>
          )}
          <div className="form-actions">
            <button
              className="button"
              disabled={uploading}
              onClick={() => setStaged(null)}
            >
              Отмена
            </button>
            <button
              className="button primary"
              disabled={uploading}
              onClick={handleUpload}
            >
              {uploading ? "Загрузка…" : "Загрузить"}
            </button>
          </div>
        </Sheet>
        {/* Create Folder Modal */}
        {isFolderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div
              className="fixed inset-0"
              onClick={() => setIsFolderModalOpen(false)}
            />
            <div className="w-full max-w-sm glass-panel rounded-3xl p-6 relative z-10 border border-border-strong ">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <h3 className="font-bold text-sm text-foreground">
                  Новая папка
                </h3>
                <button
                  onClick={() => setIsFolderModalOpen(false)}
                  className="p-1 rounded-full text-foreground-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateFolder} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-foreground-muted mb-1">
                    Название папки
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="напр.: Геометрия 10 класс"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold  transition-all"
                >
                  Создать папку
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function FilesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-foreground-muted">
          Загрузка...
        </div>
      }
    >
      <FilesContent />
    </Suspense>
  );
}

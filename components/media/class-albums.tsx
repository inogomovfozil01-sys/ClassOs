"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Images, Plus, Upload, Trash2, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, Sheet, Skeleton } from "@/components/ui/workspace";
import { MediaViewer } from "@/components/media/media-viewer";
import { useAuth } from "@/components/providers/auth-context";
import { request, json } from "@/components/tables/model";
type Album = { id: string; title: string; description: string; eventDate: string | null; audience: string; _count?: { photos: number }; photos?: { id: string }[] };
type Photo = { id: string; caption: string; uploaderId: string; createdAt: string };
const photoUrl = (id: string) => `/api/album-photos/${id}`;
function dateLabel(date: string | null) { return date ? new Date(date + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "Без даты"; }
export function ClassAlbums({ albumId }: { albumId?: string }) {
  const { user } = useAuth(); const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]); const [album, setAlbum] = useState<Album | null>(null); const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [canManage, setCanManage] = useState(false); const [canCreate, setCanCreate] = useState(false);
  const [createOpen, setCreateOpen] = useState(false); const [uploadOpen, setUploadOpen] = useState(false); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState("");
  const [files, setFiles] = useState<File[]>([]); const [caption, setCaption] = useState(""); const [viewer, setViewer] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; album: boolean } | null>(null); const input = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    setError("");
    try { const data = await request(albumId ? `/api/albums/${albumId}` : "/api/albums");
      if (albumId) { setAlbum(data.album); setPhotos(data.photos); setCanManage(data.canManage); } else { setAlbums(data.albums); setCanCreate(data.canCreate); }
    } catch(e) { setError(e instanceof Error ? e.message : "Не удалось загрузить альбом"); } finally { setLoading(false); }
  }, [albumId]);
  useEffect(() => { setLoading(true); void load(); }, [load]);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true);
    try { const data = await request("/api/albums", json("POST", { title: form.get("title"), description: form.get("description"), eventDate: form.get("eventDate") || null, audience: form.get("audience") })); setCreateOpen(false); router.push(`/albums/${data.album.id}`); }
    catch(e) { toast.error(e instanceof Error ? e.message : "Не удалось создать альбом"); } finally { setBusy(false); }
  }
  async function upload(e: React.FormEvent) {
    e.preventDefault(); if (!files.length || busy) return; setBusy(true); const failed: File[] = [];
    for (let i = 0; i < files.length; i++) { const file = files[i]; setProgress(`Загрузка ${i + 1} из ${files.length}`);
      try { const data = new FormData(); data.append("file", file); data.append("caption", caption); await request(`/api/albums/${albumId}`, { method: "POST", body: data }); }
      catch(e) { failed.push(file); toast.error(`${file.name}: ${e instanceof Error ? e.message : "Ошибка загрузки"}`); }
    }
    setBusy(false); setProgress(""); setFiles(failed); if (input.current) input.current.value = "";
    if (!failed.length) { setUploadOpen(false); setCaption(""); toast.success("Фотографии добавлены"); }
    await load();
  }
  async function remove() {
    if (!deleting || busy) return; setBusy(true);
    try { await request(deleting.album ? `/api/albums/${deleting.id}` : `/api/album-photos/${deleting.id}`, { method: "DELETE" });
      if (deleting.album) router.push("/albums"); else await load(); setDeleting(null);
    } catch(e) { toast.error(e instanceof Error ? e.message : "Не удалось удалить"); } finally { setBusy(false); }
  }
  return <AppShell title="Альбом класса"><div className="album-workspace">
    {albumId && <Link className="profile-back" href="/albums"><ArrowLeft size={16} />Все альбомы</Link>}
    <PageHeader title={albumId ? album?.title || "Альбом" : "Альбом класса"} description={albumId ? album?.description : "События, общие фотографии и воспоминания класса."} actions={<>
      {!albumId && canCreate && <button className="button primary" onClick={() => setCreateOpen(true)}><Plus size={16} />Создать альбом</button>}
      {album && !error && <><button className="button primary" onClick={() => setUploadOpen(true)}><Upload size={16} />Добавить фотографии</button>{canManage && <button className="icon-button" aria-label="Удалить альбом" onClick={() => setDeleting({ id: album.id, album: true })}><Trash2 size={16} /></button>}</>}
    </>} />
    {loading ? <Skeleton /> : error ? <EmptyState title={error} action={<button className="button" onClick={load}>Повторить</button>} /> : albumId && album ? <>
      <div className="album-meta"><span>{dateLabel(album.eventDate)}</span><span>{photos.length} фото</span><span>{album.audience === "CLASS" ? <Users size={14} /> : <Lock size={14} />}{album.audience === "CLASS" ? "Класс и классный руководитель" : "Без доступа учительницы"}</span></div>
      {!photos.length ? <EmptyState title="В альбоме пока нет фотографий" description="Добавьте первые снимки с этого события." action={<button className="button" onClick={() => setUploadOpen(true)}>Выбрать фотографии</button>} /> : <div className="photo-grid">{photos.map((p, i) => <figure key={p.id} className="album-photo"><button className="photo-open" onClick={() => setViewer(i)} aria-label={`Открыть фото ${i + 1}${p.caption ? `: ${p.caption}` : ""}`}><img src={photoUrl(p.id)} alt={p.caption || `Фото ${i + 1}`} loading="lazy" /></button><figcaption><span>{p.caption || "Без подписи"}</span>{(canManage || p.uploaderId === user?.id) && <button className="icon-button" aria-label={`Удалить фото ${i + 1}`} onClick={() => setDeleting({ id: p.id, album: false })}><Trash2 size={15} /></button>}</figcaption></figure>)}</div>}
      <MediaViewer isOpen={viewer !== null} initialIndex={viewer || 0} onClose={() => setViewer(null)} items={photos.map(p => ({ url: photoUrl(p.id), type: "image", fileName: p.caption || album.title, date: new Date(p.createdAt).toLocaleDateString("ru-RU") }))} />
    </> : !albums.length ? <EmptyState title="Первый альбом ещё не создан" description="Староста или администратор может создать альбом для события класса." /> : <div className="album-grid">{albums.map(a => <Link key={a.id} href={`/albums/${a.id}`} className="album-card"><div className="album-cover">{a.photos?.[0] ? <img src={photoUrl(a.photos[0].id)} alt="" loading="lazy" /> : <Images size={36} />}</div><div className="album-card-body"><p className="profile-eyebrow">{dateLabel(a.eventDate)}</p><h2>{a.title}</h2><p>{a._count?.photos || 0} фото · {a.audience === "CLASS" ? "Весь класс" : "Без учительницы"}</p></div></Link>)}</div>}
    <Sheet open={createOpen} onOpenChange={v => { if(!busy) setCreateOpen(v); }} title="Новый альбом" description="Выберите событие и кому будут доступны фотографии."><form className="form-stack" onSubmit={create}><label className="field">Название<input name="title" required maxLength={100} placeholder="Например, экскурсия в музей" /></label><label className="field">Дата события<input name="eventDate" type="date" /></label><label className="field">Описание<textarea name="description" maxLength={500} rows={3} /></label><label className="field">Кто видит фотографии<select name="audience" defaultValue="STUDENTS"><option value="STUDENTS">Ученики, староста и администраторы</option><option value="CLASS">Также классный руководитель</option></select></label><p className="text-xs text-foreground-muted">Публичных ссылок нет. Фотографии доступны только после входа.</p><button className="button primary" disabled={busy}>{busy ? "Создание…" : "Создать альбом"}</button></form></Sheet>
    <Sheet open={uploadOpen} onOpenChange={v => { if(!busy) setUploadOpen(v); }} title="Добавить фотографии" description="JPG, PNG или WebP, до 4 МБ каждое. До 12 фотографий за раз."><form className="form-stack" onSubmit={upload}><label className="field">Фотографии<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={e => { const selected = Array.from(e.target.files || []); if(selected.length > 12 || selected.some(f => f.size > 4 * 1024 * 1024)) { toast.error("Выберите до 12 фото, каждое до 4 МБ"); e.target.value = ""; setFiles([]); } else setFiles(selected); }} /></label>{files.length > 0 && <p className="text-xs break-words">Выбрано: {files.length}</p>}<label className="field">Подпись к выбранным фотографиям<textarea maxLength={300} rows={3} value={caption} onChange={e => setCaption(e.target.value)} disabled={busy} /></label><button className="button primary" disabled={busy || !files.length}>{busy ? progress : "Добавить в альбом"}</button><p role="status" className="sr-only">{progress}</p></form></Sheet>
    <Sheet open={!!deleting} onOpenChange={v => { if(!busy && !v) setDeleting(null); }} title={deleting?.album ? "Удалить альбом?" : "Удалить фотографию?"} description={deleting?.album ? "Все фотографии этого альбома тоже будут удалены." : "Фотография исчезнет из альбома для всех участников."}><div className="form-actions"><button className="button" disabled={busy} onClick={() => setDeleting(null)}>Отмена</button><button className="button danger" disabled={busy} onClick={remove}>{busy ? "Удаление…" : "Удалить"}</button></div></Sheet>
  </div></AppShell>;
}

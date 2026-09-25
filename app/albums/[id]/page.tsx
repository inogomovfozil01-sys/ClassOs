import { ClassAlbums } from "@/components/media/class-albums";
export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassAlbums albumId={id} />;
}

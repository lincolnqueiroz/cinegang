import ViewerRoom from '@/components/ViewerRoom'

type PageProps = {
  params: Promise<{
    stream: string
  }>
}

export default async function WatchPage({
  params,
}: PageProps) {
  const { stream } = await params

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-4 py-8">
      <ViewerRoom stream={stream} />
    </main>
  )
}

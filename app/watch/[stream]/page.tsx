import WebRTCPlayer from '@/components/WebRTCPlayer'

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
    <main className="flex min-h-screen items-center justify-center bg-black p-4">
      <WebRTCPlayer stream={stream} />
    </main>
  )
}
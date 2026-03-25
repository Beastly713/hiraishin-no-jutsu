import { PageShell } from "@/components/page-shell";
import { ReceiverSessionView } from "@/components/receiver-session-view";

type ReceivePageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ReceivePage({ params }: ReceivePageProps) {
  const { sessionId } = await params;

  return (
    <PageShell maxWidth="xl">
      <ReceiverSessionView sessionId={sessionId} />
    </PageShell>
  );
}
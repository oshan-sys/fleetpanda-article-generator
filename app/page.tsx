import { auth } from "@/auth";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import SignInScreen from "@/components/SignInScreen";

export default async function Home({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await auth();
  const { error } = searchParams;

  if (!session?.user) {
    return <SignInScreen error={error} />;
  }

  return (
    <div className="min-h-screen">
      <Header user={session.user} />
      <AppShell />
    </div>
  );
}

import { Logo } from "@/components/svg/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserLogin } from "@/routes";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/actions";
import { headers } from "next/headers";

interface HomeProps {
  searchParams: Promise<{ redirectUrl?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const headersList = await headers();
  const session = await getServerSession(headersList);
  
  // If user is already logged in, redirect to home page
  if (session.data?.user) {
    redirect("/home");
  }
  
  const params = await searchParams;
  const loginUrl = params.redirectUrl 
    ? UserLogin({  }, { redirectUrl: params.redirectUrl }) 
    : UserLogin({});
  
  return <div className="w-full h-dvh flex flex-col justify-between items-center">
    <Logo className="text-pink-dark h-20" />
    <p className="font-script text-6xl text-pink-dark">
      Bonjour !
    </p>
    <div className="flex w-full flex-col justify-center items-center px-18 pb-16 gap-4">
      <Button className="w-full text-lg text-pink-dark" variant="secondary">
        <Link href={loginUrl}>
          Se connecter
        </Link>
      </Button>
    </div>
  </div>;
}

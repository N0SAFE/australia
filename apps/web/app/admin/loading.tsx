import { Logo } from '@/components/svg/logo';

export default function Loading() {
  return (
    <div className="w-full h-dvh flex justify-center items-center">
      <Logo className="text-pink-dark w-24 h-24 animate-pulse" />
    </div>
  );
}

import Link from 'next/link';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Log in to your MaxOne wallet.</p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        New to MaxOne?{' '}
        <Link href="/signup" className="underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

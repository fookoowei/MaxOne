import Link from 'next/link';
import { SignupForm } from './signup-form';

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">Open a MaxOne wallet in seconds.</p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

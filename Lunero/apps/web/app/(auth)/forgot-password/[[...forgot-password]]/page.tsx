import { SignIn } from '@clerk/nextjs';

// Clerk handles password reset as part of the SignIn flow.
// Rendering <SignIn /> here lets Clerk's routing handle the
// /forgot-password path and all its sub-steps natively.
export default function ForgotPasswordPage() {
  return <SignIn />;
}

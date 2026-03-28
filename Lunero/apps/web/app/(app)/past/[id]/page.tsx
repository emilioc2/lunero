import { redirect } from 'next/navigation';

export default function PastDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/flowsheets/${params.id}`);
}

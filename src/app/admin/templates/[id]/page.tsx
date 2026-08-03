import { redirect } from 'next/navigation';

export default function TemplateIndexPage({ params }: { params: { id: string } }) {
  redirect(`/admin/templates/${params.id}/builder`);
}

import { OpImage, contentType, size } from "./_op-image";

export { size, contentType };
export const dynamic = "force-static";

export async function generateStaticParams() {
  return [];
}

export default async function Image({ params }: { params: { slug: string } }) {
  return OpImage(params.slug);
}

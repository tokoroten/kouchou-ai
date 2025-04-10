import { OpImage, contentType, size } from "./_op-image";
import { generateStaticParams } from "./page";

export { size, contentType, generateStaticParams };

export default async function Image({ params }: { params: { slug: string } }) {
  return OpImage(params.slug);
}

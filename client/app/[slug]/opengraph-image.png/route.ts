import { generateStaticParams } from "@/app/[slug]/page";
import { OpImage } from "../_op-image";

export { generateStaticParams };

// static build時のOGP画像生成用のroute
// ref: https://github.com/vercel/next.js/issues/51147#issuecomment-1842197049
export async function GET(
  _: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  return OpImage(slug);
}

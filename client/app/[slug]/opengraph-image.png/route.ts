import { generateStaticParams } from "@/app/[slug]/page";
import { OpImage } from "../_op-image";

export { generateStaticParams };

type PageProps = {
  params: {
    slug: string;
  };
};

// static build時のOGP画像生成用のroute
// ref: https://github.com/vercel/next.js/issues/51147#issuecomment-1842197049
export async function GET(_: Request, { params }: PageProps) {
  const slug = params.slug;
  return OpImage(slug);
}

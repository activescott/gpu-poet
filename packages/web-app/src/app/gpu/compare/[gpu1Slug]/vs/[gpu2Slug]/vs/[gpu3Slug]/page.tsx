import { compareMetadata, renderComparePage } from "../../../../../comparePage"

export const revalidate = 3600

export const dynamic = "force-dynamic"

type CompareParams = {
  params: Promise<{ gpu1Slug: string; gpu2Slug: string; gpu3Slug: string }>
}

export async function generateMetadata(props: CompareParams) {
  const { gpu1Slug, gpu2Slug, gpu3Slug } = await props.params
  return compareMetadata([gpu1Slug, gpu2Slug, gpu3Slug])
}

export default async function ComparePage(props: CompareParams) {
  const { gpu1Slug, gpu2Slug, gpu3Slug } = await props.params
  return renderComparePage([gpu1Slug, gpu2Slug, gpu3Slug])
}

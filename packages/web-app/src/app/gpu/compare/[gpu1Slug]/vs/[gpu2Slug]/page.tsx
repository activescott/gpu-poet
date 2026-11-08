import { compareMetadata, renderComparePage } from "../../../comparePage"

// Revalidate every hour
export const revalidate = 3600

// Force dynamic rendering for database access
export const dynamic = "force-dynamic"

type CompareParams = {
  params: Promise<{ gpu1Slug: string; gpu2Slug: string }>
}

export async function generateMetadata(props: CompareParams) {
  const { gpu1Slug, gpu2Slug } = await props.params
  return compareMetadata([gpu1Slug, gpu2Slug])
}

export default async function ComparePage(props: CompareParams) {
  const { gpu1Slug, gpu2Slug } = await props.params
  return renderComparePage([gpu1Slug, gpu2Slug])
}

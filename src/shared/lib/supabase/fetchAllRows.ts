// PostgREST caps each response at 1000 rows, so we page through with .range()
// to avoid silently dropping rows when a table grows past that limit.
const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  buildPage: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const all: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildPage(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }
    if (!data || data.length === 0) {
      break;
    }

    all.push(...data);

    if (data.length < PAGE_SIZE) {
      break;
    }
  }

  return all;
}

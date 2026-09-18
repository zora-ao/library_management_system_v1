export const formatAuthorName = (
  authorName: string | null | undefined,
  maxAuthors = 1
) => {
  if (!authorName) return "Author";

  const authors = authorName
    .split(/,|&|and/)
    .map((author) => author.trim())
    .filter(Boolean);

  if (authors.length > maxAuthors) {
    return `${authors[0]} et al.`;
  }

  return authorName;
};
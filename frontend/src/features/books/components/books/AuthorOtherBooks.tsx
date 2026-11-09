import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useBooks } from "@/hooks/useBooks";
import { LoadingState } from "@/components/ui/loading-spinner";
import { formatAuthorName } from "@/utils/formatAuthorName";

interface AuthorOtherBooksProps { currentBookId: string; authorName: string; }
export default function AuthorOtherBooks({ currentBookId, authorName }: AuthorOtherBooksProps) {
  const { data: books = [], isLoading, isError, refetch } = useBooks();
  const authorBooks = books.filter(book => book.id !== currentBookId && book.author.trim().toLowerCase() === authorName.trim().toLowerCase()).slice(0, 3);
  return <aside className="details-author-panel"><h2>More by this author</h2><p className="details-author-name">{formatAuthorName(authorName, 1)}</p>
    {isLoading ? <LoadingState label="Loading author’s books" containerClassName="py-8" size={20} /> : isError ? <div className="details-author-empty"><p>Couldn’t load this author’s books.</p><button type="button" onClick={() => void refetch()}>Try again</button></div> : !authorBooks.length ? <div className="details-author-empty"><span className="details-author-empty-icon" aria-hidden="true"><BookOpen size={22} strokeWidth={1.75} /></span><p>No other books by this author<br />are in the library yet.</p></div> : <div className="details-author-books">{authorBooks.map(book => <Link key={book.id} to={`/books/${book.id}`}><div className="details-author-cover">{book.image_url ? <img src={book.image_url} alt="" /> : <BookOpen size={18} strokeWidth={1.75} aria-hidden="true" />}</div><span><strong>{book.title}</strong><small>{book.available_copies > 0 ? "Available" : "On loan"}</small></span></Link>)}</div>}
  </aside>;
}

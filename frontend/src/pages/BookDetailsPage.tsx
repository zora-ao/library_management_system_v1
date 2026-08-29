import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetBookById } from "@/hooks/useBooks";
import { 
  ArrowLeft, 
  Bookmark, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Hash, 
  Heart, 
  Loader2, 
  Star, 
  User, 
  XCircle 
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BookReviews } from "@/features/books/components/books/BookReviews";
import { ReviewEntity } from "@/features/books/models/ReviewEntity";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookDetailsTable from "@/features/books/components/books/BookDetailsTable";
import RelatedBook from "@/features/books/components/books/RelatedBook";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

const BookDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: book, isLoading, isError, error } = useGetBookById(id);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (isError || !book) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-xs">
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </Button>
        <div className="p-4 border border-destructive/20 bg-destructive/10 text-destructive rounded-xl text-sm">
          Failed to load book details: {error ? (error as Error).message : "Book not found"}
        </div>
      </div>
    );
  }

  const isAvailable = book.available_copies > 0;

  // make the json object from api to the ReviewEntity instance
  const reviewsList = (book.reviews || []).map((review: any) => new ReviewEntity(review));

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 min-h-screen">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink>
              <Link to="/dashboard">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>
              <Link to="/books">Catalog</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[200px] sm:max-w-xs truncate font-medium text-foreground">
              {book.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* book image */}
        <div className="md:col-span-4 flex justify-center">
          <div className="w-56 h-80 rounded-2xl overflow-hidden shadow-sm bg-muted/50 border border-black/5">
            <img
              src={book.image_url || "/placeholder-cover.jpg"}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="md:col-span-6 space-y-4 pt-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              {book.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Author: <span className="font-semibold text-foreground">{book.author}</span>
            </p>
          </div>

          {/* rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {book.total_reviews || 0} reviews
            </span>
          </div>

          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-4 max-w-2xl">
            {book.description || "No overview available for this title."}
          </p>

          <button className="text-xs text-primary font-semibold hover:underline block pt-1">
            View More
          </button>

          <div className="flex items-center gap-3 pt-4">
            <Button className="gap-2 px-7 py-5 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-none hover:opacity-90">
              <Bookmark className="w-4 h-4" />
              Borrow
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-black/10 bg-transparent shadow-none hover:bg-black/5">
              <Heart className="w-4 h-4 text-foreground" />
            </Button>
          </div>
        </div>

        <div className="md:col-span-2">
          <RelatedBook
            authorName={book.author}
            books={[]}
            onSelectBook={(selectedId) => navigate(`/catalog/${selectedId}`)}
          />
        </div>
      </div>

      {/* content section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-4">
        <div className="lg:col-span-12">
          <Tabs defaultValue="details" className="w-full space-y-6">
            <TabsList variant="line" className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 gap-8">
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-semibold px-0 pb-3"
              >
                Book Details
              </TabsTrigger>

              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-semibold px-0 pb-3"
              >
                Reviews ({reviewsList.length})
              </TabsTrigger>

              <TabsTrigger
                value="recommendations"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-semibold px-0 pb-3"
              >
                Recommendations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <BookDetailsTable book={book} />
            </TabsContent>

            <TabsContent value="reviews">
              <BookReviews bookId={book.id} reviews={reviewsList} />
            </TabsContent>

            <TabsContent value="recommendations">
              <Card>
                <CardContent className="p-4 text-xs text-muted-foreground">
                  Recommended titles based on your reading history will appear here.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default BookDetailsPage;
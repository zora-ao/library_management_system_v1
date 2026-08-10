import { data } from 'react-router-dom'
import type { Book } from '../types/book.types'

interface BookCardProps {
  book: Book
}

const BookCard = ({ book }: BookCardProps) => {
  console.log(book)
  return (
    <div className='border p-4 text-center'>
      {book?.image_url && (
        <img src={book.image_url} />
      )}
      <div className='flex items-center justify-around my-2'>
        <h1 className='text-xl font-bold'>{book.title}</h1>
        <h3>Pages:{ book.pages }</h3>
      </div>
      <p>{book.author}</p>
      <p className='bg-gray-100 p-2 rounded'>{book?.description}</p>
    </div>
  )
}

export default BookCard

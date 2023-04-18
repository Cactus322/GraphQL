const { v4: uuid } = require('uuid')

const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')

const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const Book = require('./models/Book')
const Author = require('./models/Author')

require('dotenv').config()

const MONGODB_URI = process.env.MONGODB_URI
console.log('connecting to', MONGODB_URI)

mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log('connected to MongoDB')
    })
    .catch((error) => {
        console.log('error connection to MongoDB:', error.message)
    })

// let authors = [
//     {
//         name: 'Robert Martin',
//         id: 'afa51ab0-344d-11e9-a414-719c6709cf3e',
//         born: 1952,
//     },
//     {
//         name: 'Martin Fowler',
//         id: 'afa5b6f0-344d-11e9-a414-719c6709cf3e',
//         born: 1963,
//     },
//     {
//         name: 'Fyodor Dostoevsky',
//         id: 'afa5b6f1-344d-11e9-a414-719c6709cf3e',
//         born: 1821,
//     },
//     {
//         name: 'Joshua Kerievsky', // birthyear not known
//         id: 'afa5b6f2-344d-11e9-a414-719c6709cf3e',
//     },
//     {
//         name: 'Sandi Metz', // birthyear not known
//         id: 'afa5b6f3-344d-11e9-a414-719c6709cf3e',
//     },
// ]

// let books = [
//     {
//         title: 'Clean Code',
//         published: 2008,
//         author: 'Robert Martin',
//         id: 'afa5b6f4-344d-11e9-a414-719c6709cf3e',
//         genres: ['refactoring'],
//     },
//     {
//         title: 'Agile software development',
//         published: 2002,
//         author: 'Robert Martin',
//         id: 'afa5b6f5-344d-11e9-a414-719c6709cf3e',
//         genres: ['agile', 'patterns', 'design'],
//     },
//     {
//         title: 'Refactoring, edition 2',
//         published: 2018,
//         author: 'Martin Fowler',
//         id: 'afa5de00-344d-11e9-a414-719c6709cf3e',
//         genres: ['refactoring'],
//     },
//     {
//         title: 'Refactoring to patterns',
//         published: 2008,
//         author: 'Joshua Kerievsky',
//         id: 'afa5de01-344d-11e9-a414-719c6709cf3e',
//         genres: ['refactoring', 'patterns'],
//     },
//     {
//         title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
//         published: 2012,
//         author: 'Sandi Metz',
//         id: 'afa5de02-344d-11e9-a414-719c6709cf3e',
//         genres: ['refactoring', 'design'],
//     },
//     {
//         title: 'Crime and punishment',
//         published: 1866,
//         author: 'Fyodor Dostoevsky',
//         id: 'afa5de03-344d-11e9-a414-719c6709cf3e',
//         genres: ['classic', 'crime'],
//     },
//     {
//         title: 'The Demon ',
//         published: 1872,
//         author: 'Fyodor Dostoevsky',
//         id: 'afa5de04-344d-11e9-a414-719c6709cf3e',
//         genres: ['classic', 'revolution'],
//     },
// ]

// напиши простой сайт

const typeDefs = `
    type Book {
        title: String!
        author: Author!
        published:  Int!
        genres: [String]!
        id: ID!
    }

    type Author {
        name: String!
        bookCount: Int!
        born: Int
    }

    type Query {
        bookCount: Int
        authorCount: Int
        allBooks(author: String, genres: String): [Book!]
        allAuthors: [Author!]
    }

    type Mutation {
        addBook(
            title: String!
            author: String!
            published: Int!
            genres: [String]!
        ) : Book
        editAuthor(
            name: String!
            born: Int!
        ) : Author
    }
`
const resolvers = {
    Query: {
        bookCount: async () => Book.collection.countDocuments(),
        authorCount: async () => Author.collection.countDocuments(),
        allBooks: async (root, { author, genres }) => {
            let booksFilter = Book.find({}).populate('author', {name: 1})

            if (author) {
                booksFilter = booksFilter.filter((b) => b.author === author)
            }

            if (genres) {
                booksFilter = booksFilter.filter((b) =>
                    b.genres.find((g) => g === genres)
                )
            }

            return booksFilter
        },
        allAuthors: async () => Author.find({}),
    },
    Author: {
        bookCount: async (parent) => {
            const author = await Author.findOne({ name: parent.name })
            const count = await Book.countDocuments({ authorId: author._id })

            return count
        },
    },
    Mutation: {
        addBook: async (root, args) => {
            const author = await Author.findOneAndUpdate(
                { name: args.author },
                { name: args.author },
                { upsert: true, new: true }
            )

            const book = new Book({ ...args, author: author._id })

            return book.save()
        },
        editAuthor: async (root, { name, born }) => {
            const author = await Author.findOneAndUpdate(
                { name: name },
                { born: born },
                { new: true }
            )

            return author.save()
        },
    },
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
})

startStandaloneServer(server, {
    listen: { port: 4000 },
}).then(({ url }) => {
    console.log(`Server ready at ${url}`)
})

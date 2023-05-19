const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')
const jwt = require('jsonwebtoken')

const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const Book = require('./models/Book')
const Author = require('./models/Author')
const User = require('./models/User')
const { GraphQLError } = require('graphql')

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

    type User {
        username: String!
        favoriteGenre: String!
        id: ID!
    }

    type Token {
        value: String!
    }

    type Query {
        bookCount: Int
        authorCount: Int
        allBooks(author: String, genres: String): [Book!]
        allAuthors: [Author!]
        me: User
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
        createUser(
            username: String!
            favoriteGenre: String!
        ) : User
        login(
            username: String!
            password: String!
        ): Token
    }
`
const resolvers = {
    Query: {
        bookCount: async () => Book.collection.countDocuments(),
        authorCount: async () => Author.collection.countDocuments(),
        allBooks: async (root, { author, genres }) => {
            let booksFilter = Book.find({}).populate('author', { name: 1 })

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
        allAuthors: async () => await Author.find({}),
        me: (root, args, context) => {
            return context.currentUser
        },
    },
    Author: {
        bookCount: async (parent) => {
            const author = await Author.findOne({ name: parent.name })
            const count = await Book.countDocuments({ author: author.id })

            return count
        },
    },
    Mutation: {
        addBook: async (root, args, context) => {
            const author = await Author.findOneAndUpdate(
                { name: args.author },
                { name: args.author },
                { upsert: true, new: true }
            )

            const book = new Book({ ...args, author: author })

            if (!context.currentUser) {
                throw new GraphQLError('not authenticated', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                    },
                })
            }

            try {
                await book.save()
            } catch (error) {
                throw new GraphQLError('Saving book failed', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        invalidArgs: args.author,
                        error,
                    },
                })
            }

            return book
        },
        editAuthor: async (root, { name, born }, context) => {
            const author = await Author.findOneAndUpdate(
                { name: name },
                { born: born },
                { new: true }
            )

            if (!context.currentUser) {
                throw new GraphQLError('not authenticated', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                    },
                })
            }

            try {
                author.save()
            } catch (error) {
                throw new GraphQLError('Saving date of birth failed', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        invalidArgs: name,
                        error,
                    },
                })
            }

            return author
        },
        createUser: async (root, args) => {
            const user = new User({
                username: args.username,
                favoriteGenre: args.favoriteGenre,
            })

            return user.save().catch((error) => {
                throw new GraphQLError('Creating the user failed', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        invalidArgs: args.name,
                        error,
                    },
                })
            })
        },
        login: async (root, args) => {
            const user = await User.findOne({ username: args.username })

            if (!user || args.password !== 'secret') {
                throw new GraphQLError('wrong credentia;s', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                    },
                })
            }

            const userForToken = {
                username: user.username,
                id: user._id,
            }

            return { value: jwt.sign(userForToken, process.env.SECRET) }
        },
    },
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
})

startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req, res }) => {
        const auth = req ? req.headers.authorization : null
        if (auth && auth.startsWith('Bearer ')) {
            const decodedToken = jwt.verify(
                auth.substring(7),
                process.env.SECRET
            )
            const currentUser = await User.findById(decodedToken.id)
            return { currentUser }
        }
    },
}).then(({ url }) => {
    console.log(`Server ready at ${url}`)
})

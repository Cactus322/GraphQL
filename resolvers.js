const { GraphQLError } = require('graphql')
const { PubSub } = require('graphql-subscriptions')
const pubsub = new PubSub()

const jwt = require('jsonwebtoken')

const Book = require('./models/Book')
const Author = require('./models/Author')
const User = require('./models/User')

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
		booksByGenre: async (parent, { genre }) => {
			const books = await Book.find({}).populate('author', { name: 1 })

			return books.filter((b) => b.genres.includes(genre))
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

			pubsub.publish('BOOK_ADDED', { bookAdded: book })

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
				throw new GraphQLError('wrong credentials', {
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
	Subscription: {
		bookAdded: {
			subscribe: () => pubsub.asyncIterator('BOOK_ADDED'),
		},
	},
}

module.exports = resolvers

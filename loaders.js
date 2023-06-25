const DataLoader = require('dataloader')
const Book = require('./models/Book')
const Author = require('./models/Author')

const authorLoader = new DataLoader((keys) => {
    return Promise.all(
        keys.map(async (id) => {
			const author = await Author.findOne({ _id: id });

			const booksByAuthor = async (id) => {
				const count = await Book.countDocuments({ author: id })

				return count
			}

            const books = await booksByAuthor(id)
            return {
				name: author.name,
				born: author.born,
                bookCount: books,
            }
        })
    )
})

module.exports = authorLoader
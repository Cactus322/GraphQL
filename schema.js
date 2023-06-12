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
        booksByGenre(genre: String!): [Book!]
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

    type Subscription {
        bookAdded: Book!
    }
`

module.exports = typeDefs
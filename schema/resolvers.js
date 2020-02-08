const jwt = require("jsonwebtoken");
const { neo4jgraphql } = require("neo4j-graphql-js");

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: () => "Hello world!"
  },
  Mutation: {
    login: async (object, { email }, { driver }) => {
      const token = jwt.sign(
        { user: { email } },
        process.env.JWT_SECRET || "shhhhh"
      );
      return token;
    }
  }
};

module.exports = resolvers;

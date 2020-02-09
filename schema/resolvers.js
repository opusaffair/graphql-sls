const jwt = require("jsonwebtoken");
const { neo4jgraphql } = require("neo4j-graphql-js");
const { toNumber } = require("neo4j-driver/lib/integer");
const { fetchUser, checkPassword } = require("../utils");
// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: () => "Hello world!",
    me: (obj, params, { user }) =>
      user.email ? `Logged in as ${user.email}` : `Not logged in`
  },
  Mutation: {
    login: async (object, { email, password }, { driver }) => {
      const userNode = await fetchUser(email, driver);
      if (!userNode) throw new Error("User does not exist");
      const { _id, username, hash, roles } = userNode;
      const validPassword = await checkPassword(password, userNode.hash);
      if (!validPassword) throw new Error("Invalid password");
      const token = jwt.sign(
        {
          user: {
            email,
            _id: toNumber(_id),
            username,
            roles
          }
        },
        process.env.JWT_SECRET
      );
      return token;
    }
  }
};

module.exports = resolvers;

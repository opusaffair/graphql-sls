const { ApolloServer } = require("apollo-server-lambda");
const { makeAugmentedSchema } = require("neo4j-graphql-js");
const { applyMiddleware } = require("graphql-middleware");

const neo4j = require("neo4j-driver");
const permissions = require("./schema/permissions");
const { typeDefs } = require("./schema/typeDefs");
const resolvers = require("./schema/resolvers");
const jwt = require("jsonwebtoken");

const schema = applyMiddleware(
  makeAugmentedSchema({
    typeDefs,
    resolvers
  }),
  permissions
);

const server = new ApolloServer({
  schema,
  context: async ({ event, context }) => {
    const token =
      event.headers &&
      event.headers.authorization &&
      event.headers.authorization.split(" ")[1];
    var user = { email: null, username: null, id: null, role: [] };
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "shhhhh");
      user = decoded.user;
    }

    // add neo4j db to context
    let driver;
    if (!driver) {
      driver = neo4j.driver(
        process.env.NEO4J_URI,
        neo4j.auth.basic(
          process.env.NEO4J_USERNAME,
          process.env.NEO4J_PASSWORD
        ),
        {
          encrypted: "ENCRYPTION_ON"
        }
      );
    }
    return {
      headers: event.headers,
      functionName: context.functionName,
      driver,
      event,
      user,
      cypherParams: {
        currentUserId: user.username
      }
    };
  },
  formatError: error => {
    console.log(error);
    return error;
  },
  formatResponse: response => {
    // console.log(response);
    return response;
  },
  tracing: true,
  playground: true
});

exports.graphqlHandler = server.createHandler({
  cors: {
    origin: true,
    credentials: true
  }
});

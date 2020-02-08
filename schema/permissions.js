const { rule, shield, allow } = require("graphql-shield");

const isAuthenticated = rule()(async (parent, args, ctx, info) => {
  return ctx.user.username !== null;
});

const isOwner = rule()(async (parent, args, ctx, info) => {
  const owners = parent.owners || [];
  return owners.include(ctx.username);
});

const isSelf = rule({ fragment: "fragment UserID on User { id }" })(
  async (parent, args, ctx, info) => {
    console.log(ctx.user);
    console.log(parent);
    return ctx.user.id === parent._id;
  }
);

const permissions = shield(
  {
    Query: {
      hello: isAuthenticated
    },
    User: {
      email: isSelf
    },
    Event: {
      image_url: isOwner
    },
    Mutation: {
      login: allow
    }
  },
  { fallbackRule: isAuthenticated }
);

module.exports = permissions;

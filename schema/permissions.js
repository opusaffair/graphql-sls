const { rule, shield, allow, or } = require("graphql-shield");

const isAuthenticated = rule()(async (parent, args, ctx, info) => {
  return ctx.user.email !== null;
});

const isOwner = rule()(async (parent, args, { user }, info) => {
  // Still need to implement ownership
  const owners = parent.owners || [];
  return owners.includes(user.username);
});

const isAdmin = rule()(async (parent, args, { user }, info) => {
  console.log(user.roles);
  console.log(user.roles.includes("ADMIN"));
  console.log(user.roles.includes("ADMINISTRATOR"));
  return user.roles.includes("ADMIN") || user.roles.includes("ADMINISTRATOR");
});

const isSelf = rule({ fragment: "fragment UserID on User { id }" })(
  async (parent, args, ctx, info) => {
    const idMatch = ctx.user._id === parent._id;
    const emailMatch = ctx.user.email === parent.email;
    return idMatch && emailMatch;
  }
);

const permissions = shield({
  Query: {
    hello: isAuthenticated
  },
  User: {
    email: or(isSelf, isAdmin)
  },
  Event: {
    image_url: allow
  },
  Mutation: {
    "*": isAuthenticated,
    login: allow
  }
});

module.exports = permissions;

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
  return user.roles.includes("ADMIN") || user.roles.includes("ADMINISTRATOR");
});

const isModerator = rule()(async (parent, args, { user }, info) => {
  return user.roles.includes("MODERATOR");
});

const isSelf = rule()(async (parent, args, ctx, info) => {
  const idMatch = ctx.user._id === parent._id;
  const emailMatch = ctx.user.email === parent.email;
  return idMatch && emailMatch;
});

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
    "*": or(isModerator, isAdmin),
    login: allow
  }
});

module.exports = permissions;

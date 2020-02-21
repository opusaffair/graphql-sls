module.exports.redirect = async event => {
  const response = {
    statusCode: 301,
    headers: {
      Location: "/graphql"
    }
  };

  return response;
};

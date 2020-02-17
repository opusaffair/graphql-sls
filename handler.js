module.exports.redirect = async event => {
  const response = {
    statusCode: 301,
    headers: {
      Location: "/graphql"
    }
  };

  return response;
};

module.exports.ping = async event => {
  // console.log(event.headers.authorization);
  const response = {
    statusCode: 200,
    body: JSON.stringify(event.headers)
  };

  return response;
};

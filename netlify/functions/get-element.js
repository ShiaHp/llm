const { PrismaClient } = require("@prisma/client");
const request = require("request");
const axios = require("axios");
const prisma = new PrismaClient();

function uploadImage(imageURL) {
  const options = {
    url: "https://api.imgur.com/3/upload",
    headers: {
      Authorization: "Client-ID " + process.env.IMGUR_CLIENT_ID,
    },
  };
  return new Promise((resolve, reject) => {
    const post = request.post(options, function (err, req, body) {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    const upload = post.form();
    upload.append("image", imageURL);
    upload.append("type", "url");
  });
}

exports.handler = async (event, context) => {
  const { id, skipRender } = event.queryStringParameters;
  let element = await prisma.AlchemyElement.findFirst({
    where: { id: BigInt(id) },
  });

  const headers = {
    Authorization: `Bearer ${process.env.LIMEWIRE_API_KEY}`,
    "Content-Type": "application/json",
    "X-Api-Version": "v1",
    Accept: "application/json",
  };

  const payload = {
    prompt: `image of ${element.name}, white background`,
    aspect_ratio: "1:1",
  };

  // const response = await axios.post(
  //   "https://api.limewire.com/api/image/generation",
  //   payload,
  //   { headers: headers }
  // );

  // const imgURL = response.data.data[0].url;

  // const imgurResult = await uploadImage(imgURL);
  // element = await prisma.AlchemyElement.update({
  //   where: {
  //     id: element.id,
  //   },
  //   data: {
  //     imgUrl: imgurResult.data.link,
  //   },
  // });

  const headersOptions = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  return {
    statusCode: 200,
    headers: headersOptions,
    body: JSON.stringify(element, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    ),
  };
};

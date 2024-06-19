const { PrismaClient } = require("@prisma/client");
const request = require("request");
const axios = require("axios");
const prisma = new PrismaClient();
const { createClient } = require("pexels");

const client = createClient(process.env.PEXELS_API_KEY);

async function getPexelsImage(query) {
  try {
    const response = await client.photos.search({ query, per_page: 1 });
    console.log("response", response.photos[0].src);
    if (response && response.photos && response.photos.length > 0) {
      return response.photos[0].src.original;
    } else {
      // If no results are found, return a placeholder image
      return "https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png";
    }
  } catch (error) {
    console.error("Error fetching image from Pexels:", error);
    throw error;
  }
}

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
  console.log("id", id);
  let element = await prisma.AlchemyElement.findFirst({
    where: { id: BigInt(id) },
  });

  if (element && !element.imgUrl) {
    const prompt = `${element.name}`;
    const imgURL = await getPexelsImage(prompt);

    const imgurResult = await uploadImage(imgURL);
    element = await prisma.AlchemyElement.update({
      where: {
        id: element.id,
      },
      data: {
        imgUrl: imgurResult.data.link,
      },
    });
  }

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

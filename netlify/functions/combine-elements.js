const { PrismaClient } = require("@prisma/client");
const { OpenAI } = require("openai");
const { v4 } = require("uuid");

const uuid = v4;
// const openai = new OpenAIApi(
//   new Configuration({
//     apiKey: process.env.OPENAI_API_KEY,
//   })
// );

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.aimlapi.com",
});

const prisma = new PrismaClient();

const ALCHEMY_SYSTEM_PROMPT = `
You are a powerful alchemist, I will give you two or more items and you will do your best to describe the outcome of combining them.

Respond ONLY with a single word which is the result item or thing. Do not respond with the formula or anything else.

## Rules
* The results should be items or things
* Use lower case unless it's a proper noun
* Avoid just prefixing "super" or "mega" unless it's a common prefix for the item
* Do not use underscores

## Examples
* air + water = mist
* water + earth = mud
* fire + fire = energy
* earth + earth = land
* planet + planet = solar system
* earth + life = human
* electricity + primordial soup = life
* life + land = animal
* life + death = organic matter
* bird + metal = airplane
* fire + stone = metal
* earth + water + fire = steamy mud
* human + airplane + solar system = space traveler
* animal + metal + fire = mechanical beast
`;

async function generateElement(elements) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
  You are a powerful alchemist, I will give you two or more items and you will do your best to describe the outcome of combining them.

  Respond ONLY with a single word which is the result item or thing. Do not respond with the formula or anything else.

  ## Rules
  * The results should be items or things
  * Use lower case unless it's a proper noun
  * Avoid just prefixing "super" or "mega" unless it's a common prefix for the item
  * Do not use underscores

  ## Examples
  * air + water = mist
  * water + earth = mud
  * fire + fire = energy
  * earth + earth = land
  * planet + planet = solar system
  * earth + life = human
  * electricity + primordial soup = life
  * life + land = animal
  * life + death = organic matter
  * bird + metal = airplane
  * fire + stone = metal
  * earth + water + fire = steamy mud
  * human + airplane + solar system = space traveler
  * animal + metal + fire = mechanical beast

  What is the name of this new element created by combining ${elements[0].name} and ${elements[1].name}?
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    console.log("Generated element name:", response);
    return response;
  } catch (error) {
    console.error("Error generating element name:", error);
    return "lava";
  }
}
// async function generateElement(elements) {
//   console.log("elements", elements);

//   let elementName = "";
//   let temp = 0.1;

//   try {
//     const chatCompletion = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo-16k",
//       messages: [
//         {
//           role: "system",
//           content: ALCHEMY_SYSTEM_PROMPT,
//         },
//         {
//           role: "user",
//           content: `What is the name of this new element created by combining ${elements[0].name} and ${elements[1].name}?`,
//         },
//       ],
//       temperature: 0.7,
//       max_tokens: 128,
//     });

//     elementName = chatCompletion.choices[0].message.content;

//     elementName = elementName.toLowerCase();
//     elementName = elementName.replace(/[^a-z'\- ]/g, "");
//     if (
//       elementName.length > 0 &&
//       (elementName.match(/([\s]+)/g) || "").length < 10
//     ) {
//       console.log("elementName", elementName);
//       return elementName;
//     }
//     temp = 0.8;
//   } catch (error) {
//     console.error("Error generating element name:", error);
//     return "lava";
//   }

//   console.error("Failed to generate element name", elements);
//   return "lava";
// }

async function buildRecipe(recipeName, elementIds, userId) {
  const elementResult = await prisma.AlchemyElement.findMany({
    where: {
      id: {
        in: elementIds,
      },
    },
  });
  const elements = elementIds.map((id) =>
    elementResult.find((elr) => elr.id === id)
  );
  const elementName = await generateElement(elements);
  let resultElement = await prisma.AlchemyElement.findFirst({
    where: { name: elementName },
  });
  let isNewElement = false;
  if (!resultElement) {
    resultElement = await prisma.AlchemyElement.create({
      data: {
        name: elementName,
        imgUrl: "",
        createdUserId: userId || uuid(),
      },
    });
    isNewElement = true;

    await prisma.AlchemyRecipe.create({
      data: {
        name: recipeName,
        resultElementId: resultElement.id,
        elements: {
          create: [...new Set(elementIds)].map((id) => ({ elementId: id })),
        },
      },
    });
    return [resultElement, isNewElement];
  }

  return [resultElement, isNewElement];
}

exports.handler = async (event, context) => {
  const { elementIdsCsv, userId, date } = event.queryStringParameters;
  // eslint-disable-next-line no-undef
  const elementIds = elementIdsCsv.split(",").map(BigInt).sort();
  const recipeName = "recipe:" + elementIds.join(",");
  const [recipe, challengeHistory] = await Promise.all([
    prisma.AlchemyRecipe.findFirst({
      where: {
        name: recipeName,
      },
    }),
    // prisma.alchemyDailyChallengeOnCredits.findFirst({
    //   where: { challenge: { date: date }, credits: { userId: userId } },
    //   include: {
    //     credits: true,
    //     challenge: true,
    //   },
    // }),
  ]);

  let resultElement;
  let isNewElement = false;
  let resp;
  if (recipe) {
    resultElement = await prisma.AlchemyElement.findFirst({
      where: { id: recipe.resultElementId },
    });
    resp = {
      ...resultElement,
    };
  } else {
    [resultElement, isNewElement] = await buildRecipe(
      recipeName,
      elementIds,
      userId
    );
    console.log("resultElement", resultElement, "isNewElement", isNewElement);
    resp = {
      ...resultElement,
    };
  }
  resp.isNewElement = isNewElement;

  let challengeCredits = 0;
  let challengeLevelComplete = null;
  let challengeComplete = false;
  resp.challengeCredits = challengeCredits;
  resp.challengeComplete = challengeComplete;
  resp.challengeLevelComplete = challengeLevelComplete;
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(resp, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    ),
  };
};

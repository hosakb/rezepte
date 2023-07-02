const {
  selected,
  recipesAndIds,
  bringEmail,
  bringPassword,
  notionApiKey,
  bringList,
} = args.shortcutParameter;

let recipesContent = await fetchRecipesContent(
  selected,
  recipesAndIds,
  notionApiKey
);
const auth = await authenticate(bringEmail, bringPassword);
const { uuid, access_token } = auth;

await sendIngredientsToBring(recipesContent, uuid, access_token, bringList);

return "Done";

async function fetchRecipesContent(selected, recipesAndIds, notionApiKey) {
  let recipesContent = [];

  if (Array.isArray(selected)) {
    let promises = selected
      .map((s) => recipesAndIds.find((r) => s === r[0]))
      .map(([_, id]) => getPage(id, notionApiKey));

    recipesContent = await Promise.all(promises);
  } else {
    for (let r of recipesAndIds) {
      if (selected === r[0]) {
        recipesContent.push(await getPage(r[1], notionApiKey));
      }
    }
  }

  return recipesContent;
}

async function getPage(id, notionApiKey) {
  const firstRequestUrl = `https://api.notion.com/v1/blocks/${id}/children`;
  const firstResponse = await makeRequest(firstRequestUrl, notionApiKey);
  const param = firstResponse.results[0].id;

  const secondRequestUrl = `https://api.notion.com/v1/blocks/${param}/children`;
  const secondResponse = await makeRequest(secondRequestUrl, notionApiKey);

  return extractData(secondResponse);
}

async function makeRequest(url, notionApiKey) {
  const request = new Request(url);
  request.method = "GET";
  request.headers = {
    Authorization: `Bearer ${notionApiKey}`,
    "Notion-Version": `2022-06-28`,
  };

  return await request.loadJSON();
}

function extractData(response) {
  let map = new Map();

  for (let x of response.results) {
    if (x === response[0] || x.table_row.cells[0].length === 0) continue;
    let value =
      x.table_row.cells[1].length !== 0
        ? x.table_row.cells[1][0].plain_text
        : "";
    map.set(x.table_row.cells[0][0].plain_text, value);
  }

  return Object.fromEntries(map);
}

async function authenticate(email, password) {
  const authUrl = "https://api.getbring.com/rest/v2/bringauth";

  let req = new Request(authUrl);
  req.method = "POST";
  req.headers = {
    "X-BRING-API-KEY": "cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Sp",
    "X-BRING-CLIENT": "webApp",
    "X-BRING-CLIENT-SOURCE": "webApp",
    "X-BRING-COUNTRY": "DE",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  req.body = `email=${email}&password=${password}`;

  return await req.loadJSON();
}

async function sendIngredientsToBring(recipes, uuid, access_token, bringList) {
  const requests = recipes.flatMap((recipe) =>
    Object.entries(recipe).map(([ingredient, specification]) =>
      sendIngredient(ingredient, specification, uuid, access_token, bringList)
    )
  );

  await Promise.all(requests);
}

async function sendIngredient(
  ingredient,
  specification,
  uuid,
  access_token,
  bringList
) {
  const url = `https://api.getbring.com/rest/v2/bringlists/${bringList}`;
  const req = new Request(url);
  req.method = "PUT";
  req.headers = {
    "X-BRING-API-KEY": "cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Sp",
    "X-BRING-CLIENT": "webApp",
    "X-BRING-CLIENT-SOURCE": "webApp",
    "X-BRING-COUNTRY": "DE",
    "X-BRING-USER-UUID": uuid,
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  };
  req.body = `purchase=${ingredient}&recently=&specification=${specification}&remove=&sender=null`;

  return req.load();
}

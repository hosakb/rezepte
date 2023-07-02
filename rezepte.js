const csv = args.shortcutParameter.dbIds;
const notionApiKey = args.shortcutParameter.notionApiKey;
const dbIds = csv.split(",");
return await loadRecipeNames(dbIds, notionApiKey);

async function loadRecipeNames(dbIds, notionApiKey) {
  const promises = dbIds.map((id) => fetchFromNotionDatabase(id, notionApiKey));
  const responses = await Promise.all(promises);

  const recipeData = responses.flatMap((response) =>
    response.results.map(extractRecipeData)
  );
  const recipesAndIds = recipeData.map(({ name, id }) => [name, id]);
  const recipes = recipeData.map(({ name }) => name);

  return { recipesAndIds, recipes };
}

async function fetchFromNotionDatabase(id, notionApiKey) {
  const url = `https://api.notion.com/v1/databases/${id}/query`;
  const req = new Request(url);
  req.method = "POST";
  req.headers = {
    Authorization: `Bearer ${notionApiKey}`,
    "Notion-Version": `2022-06-28`,
  };

  return await req.loadJSON();
}

function extractRecipeData(entry) {
  const name = entry.properties.Name.title[0].plain_text;
  const id = entry.id;

  return { name, id };
}

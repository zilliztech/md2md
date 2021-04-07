const { Client } = require("@elastic/elasticsearch");
const { getMarkdownVariable } = require("../helpers/File");

const esClient = new Client({
  node: process.env.ES_URL || "http://127.0.0.1:9200",
  auth: {
    username: process.env.ES_USER,
    password: process.env.ES_PASS,
  },
});

const mark = "Elasticsearch";

const updateElastic = async (path_from, content, indexName) => {
  const remove_variable_regx = /^\-\-\-[\s\S]*\-\-\-/gi;
  const markdownInfo = getMarkdownVariable(path_from);
  if (!markdownInfo) return content;
  // it should be unique
  const fileId = markdownInfo.id;
  if (!fileId) return content;
  const remove_html_tags_regx = /\<.*?\>/gi;
  const contentWithoutHtmlTag = content.replace(remove_html_tags_regx, "");
  const contentWithoutVariables = contentWithoutHtmlTag.replace(
    remove_variable_regx,
    ""
  );
  const index = indexName;
  if (!index) {
    throw "need pass index name to elasticsearch";
  }

  const res = await esClient.exists({
    id: fileId,
    index,
  });

  const isIdExist = res.body;
  try {
    if (isIdExist) {
      await esClient.update({
        id: fileId,
        index,
        body: {
          doc: {
            content: contentWithoutVariables,
          },
        },
      });
      return content;
    }

    await esClient.index({
      index,
      id: fileId,
      body: {
        content: contentWithoutVariables,
      },
    });

    return content;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = { mark, fn: updateElastic };

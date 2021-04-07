const { getMarkdownVariable } = require("../helpers/File");
const { getConfigs } = require("../Consts");
const axios = require("axios");

const CREATE_INDEX_URL = `${
  process.env.ES_URL ||
  "http://127.0.0.1:1337/strapi-plugin-elasticsearch/create-update-index"
}`;

console.log("--- ES URL ----", CREATE_INDEX_URL);
// const esClient = new Client({
//   node: process.env.ES_URL || "http://127.0.0.1:9200",
//   auth: {
//     username: process.env.ES_USER,
//     password: process.env.ES_PASS
//   },
// });

const mark = "Elasticsearch";

const updateElastic = async (path_from, content) => {
  const remove_variable_regx = /^\-\-\-[\s\S]*\-\-\-/gi;
  const markdownInfo = getMarkdownVariable(path_from);
  const { index_name } = getConfigs();
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
  if (!index_name) {
    throw "need pass index name to elasticsearch";
  }

  try {
    const res = await axios.post(CREATE_INDEX_URL, {
      content: contentWithoutVariables,
      fileId,
      index: index_name,
    });
    console.log("---- update index ----", res);
    return content;
  } catch (error) {
    throw error;
  }

  // let isIdOrIndexExist = false;
  // try {
  //   const res = await esClient.exists({
  //     id: fileId,
  //     index,
  //   });
  //   isIdOrIndexExist = res.body;
  // } catch (error) {
  //   isIdOrIndexExist = false;
  // }

  // try {
  //   if (isIdOrIndexExist) {
  //     await esClient.update({
  //       id: fileId,
  //       index: index_name,
  //       body: {
  //         doc: {
  //           content: contentWithoutVariables,
  //         },
  //       },
  //     });
  //     return content;
  //   }

  //   await esClient.index({
  //     index: index_name,
  //     id: fileId,
  //     body: {
  //       content: contentWithoutVariables,
  //     },
  //   });

  //   return content;
  // } catch (error) {
  //   console.log(error);
  //   throw error;
  // }
};

module.exports = { mark, fn: updateElastic };

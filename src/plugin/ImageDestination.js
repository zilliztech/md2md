const path = require("path");

const { getRootPath } = require("../helpers/Path");
const { getConfigs } = require("../Consts");
const mark = "ImagePath";

// change image name to relative image path
const parseImagePath = (path_from, content) => {
  const { name_dir_images } = getConfigs();
  // get tips
  const image_regx = `\{\{${name_dir_images}.{0,1000}\}\}`;
  const regex = new RegExp(image_regx, "ig");
  let matches = content.match(regex);
  while (matches && matches.length) {
    matches.forEach((image) => {
      const imagePath = image
        .split(" ")
        .join("")
        .slice(9, image.length - 2);
      const from = path_from.split("/");
      from.pop();
      const doc_relative_image = path.relative(
        from.join("/"),
        `${getRootPath()}/${imagePath}`
      );
      content = content.replace(image, doc_relative_image);
    });
    matches = content.match(regex);
  }
  return content;
};

module.exports = { mark, fn: parseImagePath };

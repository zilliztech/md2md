const path = require('path');

const { getRootPath } = require('../helpers/Path');
const { name_dir_images } = require('../Consts');
const mark = 'ImagePath';

// change image name to relative image path
const parseImagePath = (path_from, content) => {
  // get tips
  const image_regx = `\{\{${name_dir_images}.{0,1000}\}\}`;
  const regex = new RegExp(image_regx, 'ig');
  let matches = content.match(regex);
  while (matches && matches.length) {
    matches.forEach((image) => {
      const imagePath = image
        .split(' ')
        .join('')
        .slice(9, image.length - 2);
      const doc_relative_image = path.relative(
        path_from,
        `${getRootPath()}/${imagePath}`
      );
      content = content.replace(image, doc_relative_image);
    });
    matches = content.match(regex);
  }
  return content;
};

module.exports = { mark, fn: parseImagePath };

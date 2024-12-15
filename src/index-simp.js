const easyvk = require("easyvk");
const express = require("express");
const cors = require("cors");
const settings = require("./settings");

require("dotenv").config();

const app = express();
app.use(cors());
const port = 3007;
const attachmentType = "photo";

let cache = null;
const cacheTimeMs = 5 * 60 * 1000;

const vkToken = process.env.vkToken;

async function sleep(ms) {
  return new Promise((res) => {
    setTimeout(res, ms);
  });
}

async function getPostsForGroup(groupId, tag) {
  return easyvk({
    token: vkToken,
  })
    .then((vk) => {
      return vk.call("wall.get", {
        owner_id: -groupId,
      });
    })
    .then(async (vkr) => {
      let posts = getLastPosts(vkr, tag);
      return posts;
    })
    .catch((error) => {
      console.log(error);
      return [];
    });
}

function getLastPosts(vkr, tag) {
  let posts = (vkr.items || [])
    .filter(({ text }) => {
      return text.includes(tag);
    })
    .slice(0, 10)
    .map(({ id, attachments, text, date }) => {
      let photoSizes = attachments.find(({ type }) => type === attachmentType)
        .photo.sizes;
      const bestPhoto = photoSizes[photoSizes.length - 1];

      return {
        id,
        photo: bestPhoto.url,
        text: escapeVkMarkup(text),
        date,
      };
    });

  return posts;
}

function escapeVkMarkup(text) {
  return text.replace(/\[(.*?)\|(.*?)\]/g, (_, p1, p2) => p2);
}

app.get("/get-last", async (req, res) => {
  let groups = Object.keys(settings);

  let resultReqs = [];
  let result = [];
  if (cache) {
    return res.json(cache);
  }

  for (let i = 0; i < groups.length; i++) {
    resultReqs.push(getPostsForGroup(groups[i], settings[groups[i]].tag));
    if (i < groups.length - 1) {
      sleep(300);
    }
  }

  result = await Promise.all(resultReqs); // [[], [], []]

  result = result.flat();

  result.sort((a, b) => {
    return b.date - a.date;
  });

  cache = result;
  setTimeout(() => {
    cache = null;
  }, cacheTimeMs);

  res.json(result);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const easyvk = require("easyvk");
const express = require("express");
const redis = require("redis");
const cors = require("cors");

const app = express();
const port = 3007;

const groupId = "42471820";
const tag = "афиша_дружба";

const cacheDuration = 300; // 5 minutes in seconds

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
});

redisClient.on("error", (err) => {
  console.log("Redis error: ", err);
});

redisClient.connect().catch(console.error);

async function getPostsForGroup(groupId, tag) {
  easyvk({
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
    });
}

function getLastPosts(vkr, tag) {
  let posts = (vkr.items || [])
    .filter(({ text }) => {
      return text.includes(tag);
    })
    .sort((a, b) => {
      return b.date - a.date;
    })
    .slice(0, 10);
  return posts;
}

app.get("/get-last", (req, res) => {
  const cacheKey = `${groupId}:${tag}`;

  redisClient.get(cacheKey, async (err, cachedData) => {
    if (err) {
      console.error("Redis get error:", err);
      res.status(500).send("Internal Server Error");
      return;
    }

    if (cachedData) {
      // If data is found in the cache, return it
      res.json(JSON.parse(cachedData));
    } else {
      // If data is not found in the cache, fetch from the API
      try {
        const posts = await getPostsForGroup(groupId, tag);

        // Store the fetched data in Redis with an expiration time of 5 minutes
        redisClient.setex(cacheKey, cacheDuration, JSON.stringify(posts));

        res.json(posts);
      } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).send("Error fetching posts");
      }
    }
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

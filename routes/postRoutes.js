const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate("user", "name username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const postIds = posts.map(post => post._id);

    const [likeCounts, commentCounts] = await Promise.all([
      Like.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } }
      ]),
      Comment.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } }
      ])
    ]);

    const likeMap = new Map(likeCounts.map(item => [item._id.toString(), item.count]));
    const commentMap = new Map(commentCounts.map(item => [item._id.toString(), item.count]));

    const feed = posts.map(post => ({
      ...post,
      likes: likeMap.get(post._id.toString()) || 0,
      comments: commentMap.get(post._id.toString()) || 0
    }));

    res.json(feed);
  } catch (error) {
    next(error);
  }
});

router.post("/", protect, async (req, res, next) => {
  try {
    const { imageUrl, caption } = req.body;

    if (!caption && !imageUrl) {
      return res.status(400).json({ message: "caption or imageUrl is required" });
    }

    const post = await Post.create({
      user: req.user._id,
      imageUrl: imageUrl || "",
      caption
    });

    const result = await post.populate("user", "name username");

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/feed", protect, async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const userIds = [...req.user.following, req.user._id];

    const posts = await Post.find({
      user: { $in: userIds }
    })
      .populate("user", "name username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const postIds = posts.map(post => post._id);

    const [likeCounts, commentCounts] = await Promise.all([
      Like.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } }
      ]),
      Comment.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } }
      ])
    ]);

    const likeMap = new Map(likeCounts.map(item => [item._id.toString(), item.count]));
    const commentMap = new Map(commentCounts.map(item => [item._id.toString(), item.count]));

    const feed = posts.map(post => ({
      ...post,
      likes: likeMap.get(post._id.toString()) || 0,
      comments: commentMap.get(post._id.toString()) || 0
    }));

    res.json({ page, limit, posts: feed });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "name username");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const [likes, comments] = await Promise.all([
      Like.countDocuments({ post: post._id }),
      Comment.countDocuments({ post: post._id })
    ]);

    res.json({ ...post.toObject(), likes, comments });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", protect, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can edit only your own post" });
    }

    const { caption, imageUrl } = req.body;

    if (caption !== undefined) post.caption = caption;
    if (imageUrl !== undefined) post.imageUrl = imageUrl;

    await post.save();

    res.json({
      message: "Post updated",
      post
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", protect, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can delete only your own post" });
    }

    await Promise.all([
      Post.deleteOne({ _id: post._id }),
      Like.deleteMany({ post: post._id }),
      Comment.deleteMany({ post: post._id })
    ]);

    res.json({ message: "Post deleted" });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/like", protect, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const existing = await Like.findOne({
      user: req.user._id,
      post: post._id
    });

    if (existing) {
      return res.status(400).json({ message: "You already liked this post" });
    }

    await Like.create({
      user: req.user._id,
      post: post._id
    });

    const count = await Like.countDocuments({ post: post._id });

    res.json({ message: "Post liked", likes: count });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "You already liked this post" });
    }
    next(error);
  }
});

router.delete("/:id/like", protect, async (req, res, next) => {
  try {
    const result = await Like.findOneAndDelete({
      user: req.user._id,
      post: req.params.id
    });

    if (!result) {
      return res.status(400).json({ message: "You have not liked this post" });
    }

    const count = await Like.countDocuments({ post: req.params.id });

    res.json({ message: "Like removed", likes: count });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
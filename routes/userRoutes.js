const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/search", async (req, res, next) => {
  try {
    const q = req.query.username || "";

    const users = await User.find({
      username: { $regex: q, $options: "i" }
    })
      .select("name username bio")
      .limit(20);

    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get("/:username", async (req, res, next) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase()
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const postCount = await Post.countDocuments({ user: user._id });

    res.json({
      id: user._id,
      name: user.name,
      username: user.username,
      bio: user.bio,
      followers: user.followers.length,
      following: user.following.length,
      posts: postCount
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:username/posts", async (req, res, next) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase()
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const posts = await Post.find({ user: user._id })
      .populate("user", "name username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ page, limit, posts });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/follow", protect, async (req, res, next) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const target = await User.findById(req.params.id);

    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.following.some(id => id.toString() === target._id.toString())) {
      return res.status(400).json({ message: "Already following this user" });
    }

    req.user.following.push(target._id);
    target.followers.push(req.user._id);

    await req.user.save();
    await target.save();

    res.json({ message: `You are now following ${target.username}` });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/follow", protect, async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);

    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user.following = req.user.following.filter(
      id => id.toString() !== target._id.toString()
    );

    target.followers = target.followers.filter(
      id => id.toString() !== req.user._id.toString()
    );

    await req.user.save();
    await target.save();

    res.json({ message: `You unfollowed ${target.username}` });
  } catch (error) {
    next(error);
  }
});

module.exports = router;



import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Register
export const registerUser = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ success: false, message: "Please provide all fields" });
  }
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already exists!" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword, isAdmin: false },
    });
    const token = jwt.sign(
      { userId: user.id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.status(201).json({ success: true, user, token }); // <-- include token
  } catch (error) {
    console.error("Register error", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// loginUser controller (auth.controller.ts)

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


// Google
export const syncGoogleUser = async (req: Request, res: Response) => {
  const { email, name } = req.body;
  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, username: name, password: '', isAdmin: false, provider: 'google' },
      });
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        isAdmin: user.isAdmin
      },
      token // <-- include token
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};
export const logoutUser = (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).json({ success: true, message: "Logged out!" });
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Get users error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch users" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, email, password } = req.body;

  if (!req.user || (req.user.id !== id && !req.user.isAdmin)) {
    return res.status(403).json({ success: false, message: "Access denied!" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const updatedData: Partial<typeof user> = {};
    if (username) updatedData.username = username;
    if (email) updatedData.email = email;
    if (password) updatedData.password = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updatedData,
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    return res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update user error", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

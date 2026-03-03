import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const login = async (req, res) => {
  const { mail, password } = req.body;

  const { rows } = await pool.query(
    "SELECT * FROM app_user WHERE mail=$1",
    [mail]
  );

  if (!rows.length)
    return res.status(404).json({ message: "User not found" });

  const user = rows[0];

  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return res.status(401).json({ message: "Wrong password" });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET
  );

  res.json({ token, role: user.role });
};

export const register = async (req, res) => {
  const { name, mail, number, password, role } = req.body;

  try {
    const { rows } = await pool.query(
      "SELECT id FROM app_user WHERE mail=$1",
      [mail]
    );

    if (rows.length)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO app_user (name, mail, number, password, role)
       VALUES ($1,$2,$3,$4,$5)`,
      [name, mail, number, hashedPassword, role]
    );

    res.json({ message: "User registered successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};
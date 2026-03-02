import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const login = async (req ,res) => {
    const { mail, password} = req.body;

    const { rows } = await pool.query(
        "SELECT * FROM app_user WHERE mail=$1",
        [mail]
    )
    if (!rows.length)
        return res.status(404).json({message:"User not found"});

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if(!match)
        return res.status(401).json({message:"Wrong password"});

    const token = jwt.sign(
        {id: user.id, role: user.role},
        process.env.JWT_SECRET
    );
    res.json({token, role:user.role})
};
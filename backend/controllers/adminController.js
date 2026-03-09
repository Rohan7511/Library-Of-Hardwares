import pool from "../config/db.js";

export const addProduct = async (req, res) => {
  const { name, image_url, condition_note, quantity } = req.body;

  await pool.query(
    `INSERT INTO product 
     (name,image_url,condition_note,total_quantity,available_quantity)
     VALUES ($1,$2,$3,$4,$4)`,
    [name, image_url, condition_note, quantity]
  );

  res.json({ message: "Product added" });
};

export const deleteProduct = async (req, res) => {
  await pool.query("DELETE FROM product WHERE id=$1", [req.params.id]);
  res.json({ message: "Deleted" });
};

export const updateStock = async (req, res) => {
  const { product_id, qty } = req.body;

  await pool.query(
    `UPDATE product 
     SET total_quantity = total_quantity + $1,
         available_quantity = available_quantity + $1
     WHERE id=$2`,
    [qty, product_id]
  );

  res.json({ message: "Stock updated" });
};

export const viewAllRequests = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name as student_name, u.mail as student_email, u.number as student_phone 
       FROM request r
       JOIN app_user u ON r.student_id = u.id
       ORDER BY r.id DESC`
    );
    
    // Fetch items for each request
    for (let reqRow of rows) {
      const { rows: items } = await pool.query(
        `SELECT p.name, ri.requested_qty 
         FROM request_items ri
         JOIN product p ON ri.product_id = p.id
         WHERE ri.request_id = $1`,
        [reqRow.id]
      );
      reqRow.items = items;
    }
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
import pool from "../config/db.js";

export const viewProducts = async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id,name,image_url,available_quantity FROM product"
  );
  res.json(rows);
};

export const makeRequest = async (req, res) => {
  const { items } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "INSERT INTO request (student_id, due_date) VALUES ($1, CURRENT_DATE + INTERVAL '15 days') RETURNING id",
      [req.user.id]
    );

    const requestId = rows[0].id;
    for (let item of items) {
      await client.query(
        "INSERT INTO request_items (request_id,product_id,requested_qty) VALUES ($1,$2,$3)",
        [requestId, item.product_id, item.qty]
      );
    }

    await client.query("COMMIT");

    res.json({ message: "Request submitted" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const myRequests = async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM request WHERE student_id=$1",
    [req.user.id]
  );
  res.json(rows);
};
import pool from "../config/db.js";

export const viewPending = async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM request WHERE status='pending'"
  );
  res.json(rows);
};

export const approveRequest = async (req, res) => {
  const { request_id, location } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE request 
       SET status='approved',
           approved_by=$1,
           collection_location=$2,
           collection_time=CURRENT_TIMESTAMP
       WHERE id=$3`,
      [req.user.id, location, request_id]
    );

    await client.query(
      `UPDATE product p
       SET available_quantity = p.available_quantity - ri.requested_qty
       FROM request_items ri
       WHERE p.id = ri.product_id
       AND ri.request_id = $1`,
      [request_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Approved" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

export const acceptReturn = async (req, res) => {
  const { request_id } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE request SET status='returned' WHERE id=$1",
      [request_id]
    );

    await client.query(
      `UPDATE product p
       SET available_quantity = p.available_quantity + ri.requested_qty
       FROM request_items ri
       WHERE p.id = ri.product_id
       AND ri.request_id = $1`,
      [request_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Return accepted" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};